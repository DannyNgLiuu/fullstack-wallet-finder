import sys
import json
from seleniumbase import Driver
from bs4 import BeautifulSoup
import time
import re
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
import hashlib

def get_debug_info(driver):
    """Get debug information about the current state"""
    try:
        # Get all wallet addresses currently shown
        addresses = []
        wallet_elements = driver.find_elements("xpath", "//div[contains(@class, 'custom-1nvxwu0')]//a[contains(@href, '/account/')]")
        for elem in wallet_elements:
            href = elem.get_attribute('href')
            if href:
                addr = href.split("account/")[-1].split('?')[0]
                addresses.append(addr[:10] + "...")  # Just first 10 chars
        
        # Get active time period button
        active_button = None
        time_buttons = driver.find_elements("xpath", "//button[contains(@class, 'chakra-button custom-vcltov')]")
        for btn in time_buttons:
            if 'custom-1qj5c82' in btn.get_attribute('class'):  # This class indicates active button
                active_button = btn.text.strip()
                break
        
        # Get current PnL values for first few wallets
        pnl_values = []
        pnl_elements = driver.find_elements("xpath", "//span[contains(@class, 'custom-1e9y0rl')]")[:5]
        for elem in pnl_elements:
            pnl_values.append(elem.text.strip())
        
        return {
            "num_wallets": len(addresses),
            "wallet_previews": addresses[:5],  # First 5 addresses
            "active_period": active_button,
            "pnl_previews": pnl_values,  # First 5 PnL values
            "timestamp": time.strftime("%H:%M:%S")
        }
    except Exception as e:
        return {"error": str(e)}

def get_current_wallet_data(driver):
    """Get current wallet data HTML to detect changes"""
    try:
        # Get all wallet addresses and their PnL values to detect real data changes
        wallets = []
        wallet_elements = driver.find_elements("xpath", "//div[contains(@class, 'custom-1nvxwu0')]")
        
        for elem in wallet_elements:
            try:
                # Get wallet address
                addr = elem.find_element("xpath", ".//a[contains(@href, '/account/')]").get_attribute('href')
                addr = addr.split("account/")[-1].split('?')[0]
                
                # Get all relevant data
                bought = "0"
                sold = "0"
                pnl = "0"
                
                # Check for dash elements (no bought amount)
                dash_elements = elem.find_elements("xpath", ".//span[contains(@class, 'chakra-text custom-6qd5i2')]")
                has_dash = len(dash_elements) > 0
                
                if not has_dash:
                    try:
                        bought_elem = elem.find_element("xpath", ".//span[contains(@class, 'chakra-text custom-rcecxm')]")
                        bought = bought_elem.text.strip()
                    except:
                        pass
                
                try:
                    sold_elem = elem.find_element("xpath", ".//span[contains(@class, 'chakra-text custom-dv3t8y')]")
                    sold = sold_elem.text.strip()
                except:
                    pass
                    
                try:
                    pnl_elem = elem.find_element("xpath", ".//span[contains(@class, 'custom-1e9y0rl')]")
                    pnl = pnl_elem.text.strip()
                except:
                    pass
                
                # Create a composite string with all data
                wallets.append(f"{addr}:{bought}:{sold}:{pnl}")
            except Exception as e:
                print(f"Error processing wallet element: {e}", file=sys.stderr)
                continue
                
        return len(wallets), "\n".join(wallets)
    except Exception as e:
        print(f"Error getting wallet data: {e}", file=sys.stderr)
        return 0, ""

def wait_for_button_activation(driver, time_period):
    """Wait for the time period button to become active"""
    max_attempts = 30
    for attempt in range(max_attempts):
        try:
            # Find all time period buttons within the chakra-stack
            buttons = driver.find_elements("xpath", "//div[contains(@class, 'chakra-stack')]//button[contains(@class, 'chakra-button')]")
            
            for button in buttons:
                # Get all button classes
                button_classes = button.get_attribute('class')
                
                # Find the span with time period text
                try:
                    span = button.find_element("xpath", ".//span[contains(@class, 'chakra-text custom-1u3k8gl')]")
                    button_text = span.text.strip()
                    
                    # Check if this button contains our time period
                    if time_period == button_text:
                        print(f"Found matching button for {time_period}", file=sys.stderr)
                        # Check if button is active
                        if 'custom-ymz8t5' in button_classes:
                            print(f"Button {time_period} is active!", file=sys.stderr)
                            return True
                        else:
                            print(f"Button {time_period} found but not active", file=sys.stderr)
                except Exception as e:
                    continue
            
            time.sleep(0.5)
        except Exception as e:
            time.sleep(0.5)
    return False

def scrape_token_wallets(pair, time_period='30d'):
    driver = Driver(uc=True, headless=True)
    wallets = []
    
    try:
        url = f"https://dexscreener.com/solana/{pair}"
        print(f"Scraping {pair} for {time_period}...", file=sys.stderr)
        
        driver.uc_open_with_reconnect(url, reconnect_time=15)
        
        # Click the top traders button
        button = driver.find_element(
            "xpath", "//*[@id='root']/div/main/div/div/div[2]/div[1]/div[2]/div/div[1]/div[1]/div[1]/div/div[1]/button[2]"
        )
        driver.execute_script("arguments[0].click();", button)
        time.sleep(3)
        
        # Get initial wallet data hash for comparison
        initial_count, initial_data = get_current_wallet_data(driver)
        initial_hash = hashlib.md5(initial_data.encode()).hexdigest()
        
        # Switch to desired time period if not default
        if time_period != '30d':
            try:
                # Find and click time period button
                buttons = driver.find_elements("xpath", "//button[contains(@class, 'chakra-button')]")
                target_button = None
                
                for button in buttons:
                    button_text = button.text.strip().lower()
                    if button_text == time_period.lower():
                        target_button = button
                        break
                    
                if target_button:
                    # Try clicking the button up to 3 times
                    for attempt in range(3):
                        driver.execute_script("arguments[0].click();", target_button)
                        
                        if wait_for_button_activation(driver, time_period):
                            # Wait for data to change
                            for i in range(30):
                                time.sleep(1)
                                current_count, current_data = get_current_wallet_data(driver)
                                current_hash = hashlib.md5(current_data.encode()).hexdigest()
                                
                                if current_hash != initial_hash:
                                    break
                            
                            break
                        else:
                            if attempt < 2:
                                time.sleep(2)
                    
                    # Verify we're on the right time period
                    if not wait_for_button_activation(driver, time_period):
                        print(f"Warning: Failed to switch to {time_period}", file=sys.stderr)
                        return []
                else:
                    print(f"Could not find button for time period {time_period}", file=sys.stderr)
                    return []
                    
            except Exception as e:
                print(f"Error selecting time period: {e}", file=sys.stderr)
                return []
        
        # Only scrape after we're sure the data has updated
        page_html = driver.get_page_source()
        soup = BeautifulSoup(page_html, 'html.parser')
        
        # Find wallet containers that contain all information for each wallet
        target_divs = soup.find_all('div', class_='custom-1nvxwu0')
        
        for idx, div in enumerate(target_divs):
            try:
                # Get wallet address from this container
                a_tag = div.find('a', href=True)
                if not a_tag or "account/" not in a_tag['href']:
                    continue
                    
                wallet_address = a_tag['href'].split("account/")[-1].split('?')[0]
                
                # Initialize wallet data
                wallet_data = {
                    "address": wallet_address,
                    "bought": "0",
                    "sold": "0",
                    "pnl": "0",
                    "time_period": time_period
                }
                
                # Look for specific elements with the correct classes
                bought_spans = div.find_all('span', class_='chakra-text custom-rcecxm')
                sold_spans = div.find_all('span', class_='chakra-text custom-dv3t8y')
                pnl_spans = div.find_all(class_='custom-1e9y0rl')
                
                # Check for dash elements (no bought amount)
                dash_elements = div.find_all(class_="chakra-text custom-6qd5i2")
                has_dash_element = len(dash_elements) > 0
                
                # Extract bought amount
                if has_dash_element:
                    wallet_data["bought"] = "0"
                elif bought_spans:
                    bought_text = bought_spans[0].get_text().strip()
                    if not bought_text.startswith('$'):
                        bought_text = '$' + bought_text
                    wallet_data["bought"] = bought_text
                
                # Extract sold amount
                if sold_spans:
                    sold_text = sold_spans[0].get_text().strip()
                    if not sold_text.startswith('$'):
                        sold_text = '$' + sold_text
                    wallet_data["sold"] = sold_text
                
                # Extract PnL amount
                if pnl_spans:
                    pnl_text = pnl_spans[0].get_text().strip()
                    if not pnl_text.startswith('$') and not pnl_text.startswith('-$'):
                        if pnl_text.startswith('-'):
                            pnl_text = '-$' + pnl_text[1:]
                        else:
                            pnl_text = '$' + pnl_text
                    wallet_data["pnl"] = pnl_text
                
                wallets.append(wallet_data)
                
            except Exception as e:
                print(f"Error processing wallet {idx}: {e}", file=sys.stderr)
                continue
        
        return wallets
        
    except Exception as e:
        print(f"Error scraping {pair}: {str(e)}", file=sys.stderr)
        return []
    finally:
        driver.quit()

def parse_money_string(money_str):
    """Convert money string like '$1.2K' to float value"""
    if not money_str or money_str == "0" or money_str == "-":
        return 0
    
    # Handle negative values
    is_negative = money_str.startswith('-') or money_str.startswith('$-')
    
    # Remove $ and other currency symbols, keep numbers and multipliers
    clean_str = re.sub(r'[^\d.KMB,]', '', money_str.replace('-', ''))
    
    # Handle K, M, B multipliers
    multiplier = 1
    if 'K' in clean_str:
        multiplier = 1000
        clean_str = clean_str.replace('K', '')
    elif 'M' in clean_str:
        multiplier = 1000000
        clean_str = clean_str.replace('M', '')
    elif 'B' in clean_str:
        multiplier = 1000000000
        clean_str = clean_str.replace('B', '')
    
    try:
        # Remove commas and convert
        clean_str = clean_str.replace(',', '')
        value = float(clean_str) * multiplier
        return -value if is_negative else value
    except:
        return None

def format_money_value(value):
    """Format float value back to readable string"""
    if value is None or value == 0:
        return "$0"
    
    is_negative = value < 0
    value = abs(value)
    
    if value >= 1000000000:
        formatted = f"${value/1000000000:.1f}B"
    elif value >= 1000000:
        formatted = f"${value/1000000:.1f}M"
    elif value >= 1000:
        formatted = f"${value/1000:.1f}K"
    else:
        formatted = f"${value:.0f}"
    
    return f"-{formatted}" if is_negative else formatted

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scrape_token.py <pair> [time_period]", file=sys.stderr)
        sys.exit(1)
    
    pair = sys.argv[1]
    time_period = sys.argv[2] if len(sys.argv) > 2 else '30d'
    wallets = scrape_token_wallets(pair, time_period)
    
    print(json.dumps(wallets))