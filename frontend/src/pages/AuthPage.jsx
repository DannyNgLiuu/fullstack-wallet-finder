import React, { useState, useEffect } from 'react';

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [isAnimating, setIsAnimating] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showMessage, setShowMessage] = useState(false);

    useEffect(() => {
    if (message) {
        setShowMessage(true); // fade-in
        const timer = setTimeout(() => {
        setShowMessage(false); // fade-out
        setTimeout(() => {
            setMessage('');
            setMessageType('');
        }, 300); // wait for fade-out to finish
        }, 2000);

        return () => clearTimeout(timer);
    }
    }, [message]);


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (type) => {
    if (!form.email || !form.password) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }

    const endpoint = type === 'Login' ? '/login' : '/register';

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      console.log(`${type} successful:`, data);

      if (type === 'Login') {
        localStorage.setItem('token', data.token);
        setMessage('Login successful');
        setMessageType('success');

        setTimeout(() => {
            window.location.href = '/home';
        }, 1000);
      } else {
        setMessage('Register successful. Please login.');
        setMessageType('success');
        setActiveTab('login');
      }
    } catch (error) {
      console.error(`${type} error:`, error.message);
      setMessage(error.message);
      setMessageType('error');
    }
  };

  const handleTabChange = (newTab) => {
    if (newTab !== activeTab) {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveTab(newTab);
        setIsAnimating(false);
      }, 150);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6">
            <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
                message ? 'max-h-20 mb-4' : 'max-h-0 mb-0'
            }`}
            >
            <div
                className={`transition-all ease-out duration-500 transform text-center p-3 rounded-xl font-medium ${
                message ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                } ${
                messageType === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
            >
                {message}
            </div>
            </div>


          {/* Tabs */}
          <div className="relative flex w-full mb-8 bg-slate-100 rounded-lg p-1">
            <div
              className={`absolute top-1 bottom-1 w-1/2 bg-slate-900 rounded-md transition-transform duration-300 ease-out ${
                activeTab === 'register' ? 'transform translate-x-full' : ''
              }`}
            />
            <button
              onClick={() => handleTabChange('login')}
              className={`relative z-10 flex-1 py-2 px-4 text-center font-medium rounded-md transition-colors duration-300 ${
                activeTab === 'login'
                  ? 'text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => handleTabChange('register')}
              className={`relative z-10 flex-1 py-2 px-4 text-center font-medium rounded-md transition-colors duration-300 ${
                activeTab === 'register'
                  ? 'text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Register
            </button>
          </div>

          {/* Forms */}
          <div className="relative overflow-hidden">
            <div
              className={`flex transition-transform duration-300 ease-out ${
                activeTab === 'register' ? '-translate-x-1/2' : 'translate-x-0'
              }`}
              style={{ width: '200%' }}
            >
              {/* Login Form */}
              <div className="w-1/2 space-y-4 pr-2">
                <div className={`transform transition-all duration-300 ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                  <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-slate-500 text-slate-900 transition-all duration-200"
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={`transform transition-all duration-300 delay-75 ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                  <input
                    name="password"
                    type="password"
                    placeholder="Password"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-slate-500 text-slate-900 transition-all duration-200"
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={`transform transition-all duration-300 delay-150 ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                  <button
                    onClick={() => handleSubmit('Login')}
                    className="w-full bg-gradient-to-r from-slate-900 to-slate-700 text-white py-3 px-4 rounded-xl hover:from-slate-800 hover:to-slate-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Login
                  </button>
                </div>
              </div>

              {/* Register Form */}
              <div className="w-1/2 space-y-4 pl-2">
                <div className={`transform transition-all duration-300 ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                  <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-slate-500 text-slate-900 transition-all duration-200"
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={`transform transition-all duration-300 delay-75 ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                  <input
                    name="password"
                    type="password"
                    placeholder="Password"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-slate-500 text-slate-900 transition-all duration-200"
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={`transform transition-all duration-300 delay-150 ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                  <button
                    onClick={() => handleSubmit('Register')}
                    className="w-full bg-gradient-to-r from-slate-900 to-slate-700 text-white py-3 px-4 rounded-xl hover:from-slate-800 hover:to-slate-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Register
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
