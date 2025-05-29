import sys
import json
from seleniumbase import Driver
from bs4 import BeautifulSoup
import time
import re

def scrape_token_wallets(pair):
    driver = Driver(uc=True, headless=True)
    wallets = []
    
    try:
        url = f"https://dexscreener.com/solana/{pair}"
        print(f"Scraping {pair}...", file=sys.stderr)
        
        driver.uc_open_with_reconnect(url, reconnect_time=15)
        driver.wait_for_element_visible("div.custom-zl2cr9", timeout=10)
        
        # Click the top traders button
        button = driver.find_element(
            "xpath", "//*[@id='root']/div/main/div/div/div[2]/div[1]/div[2]/div/div[1]/div[1]/div[1]/div/div[1]/button[2]"
        )
        driver.execute_script("arguments[0].click();", button)
        time.sleep(5)
        
        page_html = driver.get_page_source()
        soup = BeautifulSoup(page_html, 'html.parser')
        
        # Find wallet containers that contain all information for each wallet
        target_divs = soup.find_all('div', class_='custom-1nvxwu0')
        print(f"Found {len(target_divs)} complete wallet containers", file=sys.stderr)
        
        for idx, div in enumerate(target_divs):
            try:
                # Get wallet address from this container
                a_tag = div.find('a', href=True)
                if not a_tag or "account/" not in a_tag['href']:
                    continue
                    
                wallet_address = a_tag['href'].split("account/")[-1].split('?')[0]
                print(f"Processing wallet {idx + 1}: {wallet_address[:10]}...", file=sys.stderr)
                
                # Initialize wallet data
                wallet_data = {
                    "address": wallet_address,
                    "bought": "0",
                    "sold": "0",
                    "pnl": "0"
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
                print(f"Added wallet: {wallet_data}", file=sys.stderr)
                
            except Exception as e:
                print(f"Error processing wallet {idx}: {e}", file=sys.stderr)
                continue
        
        print(f"Successfully extracted {len(wallets)} wallets with trading data", file=sys.stderr)
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
    if len(sys.argv) != 2:
        print("Usage: python scrape_token.py <pair>", file=sys.stderr)
        sys.exit(1)
    
    pair = sys.argv[1]
    wallets = scrape_token_wallets(pair)
    
    print(json.dumps(wallets))