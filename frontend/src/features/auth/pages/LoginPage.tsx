import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username || !password) return;

    try {
      setError('');
      const res = await authService.login(username, password);
      if (res.user.role === 'ADMIN') {
        navigate('/admin/assets');
      } else {
        navigate('/tech/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác!');
    }
  };

  const loginAs = async (role: 'ADMIN' | 'TECHNICAL') => {
    const defaultUser = role === 'ADMIN' ? 'admin' : 'tech';
    const defaultPass = 'password';
    
    setUsername(defaultUser);
    setPassword(defaultPass);

    try {
      setError('');
      const res = await authService.login(defaultUser, defaultPass);
      if (res.user.role === 'ADMIN') {
        navigate('/admin/assets');
      } else {
        navigate('/tech/dashboard');
      }
    } catch (err: any) {
      setError('Lỗi đăng nhập nhanh: ' + (err.response?.data?.message || 'Không kết nối được Backend!'));
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 text-white relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Hospital Signage
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Hệ thống quản lý biển báo bệnh viện</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Tên đăng nhập</label>
            <Input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập admin hoặc tech..."
              className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Mật khẩu</label>
            <Input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-blue-500"
            />
          </div>

          {error && <p className="text-red-400 text-xs mt-1 font-medium">{error}</p>}

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors py-6 text-base font-semibold rounded-xl mt-6">
            Đăng Nhập
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-800 px-2 text-gray-400">Demo Login nhanh</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={() => loginAs('ADMIN')}
            variant="outline" 
            className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            Vai Admin
          </Button>
          <Button 
            onClick={() => loginAs('TECHNICAL')}
            variant="outline" 
            className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            Vai Kỹ thuật
          </Button>
        </div>
      </div>
    </div>
  );
}
