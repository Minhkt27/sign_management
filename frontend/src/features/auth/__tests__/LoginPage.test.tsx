import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import LoginPage from '@/features/auth/pages/LoginPage';
import * as authServiceModule from '@/services/authService';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/services/authService', () => ({
  authService: { login: vi.fn() },
}));

const renderPage = () => render(<LoginPage />, { wrapper: MemoryRouter });

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders username input, password input and login button', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/nhập tên đăng nhập/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /đăng nhập/i })).toBeInTheDocument();
  });

  it('navigates to /admin/assets after ADMIN login', async () => {
    vi.mocked(authServiceModule.authService.login).mockResolvedValueOnce({
      token: 'tok',
      refreshToken: 'ref',
      user: { id: 1, username: 'admin', fullName: 'Admin', role: 'ADMIN' },
    });

    renderPage();
    await userEvent.type(screen.getByPlaceholderText(/nhập tên đăng nhập/i), 'admin');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password');
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin/assets/tree'));
  });

  it('navigates to /tech/dashboard after TECHNICAL login', async () => {
    vi.mocked(authServiceModule.authService.login).mockResolvedValueOnce({
      token: 'tok',
      refreshToken: 'ref',
      user: { id: 2, username: 'tech', fullName: 'Tech', role: 'TECHNICAL' },
    });

    renderPage();
    await userEvent.type(screen.getByPlaceholderText(/nhập tên đăng nhập/i), 'tech');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password');
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/tech/dashboard'));
  });

  it('shows error message from API on failed login', async () => {
    const err = new AxiosError('Sai mật khẩu');
    err.response = { data: { message: 'Sai mật khẩu' }, status: 401, statusText: '', headers: {}, config: {} as never };
    vi.mocked(authServiceModule.authService.login).mockRejectedValueOnce(err);

    renderPage();
    await userEvent.type(screen.getByPlaceholderText(/nhập tên đăng nhập/i), 'admin');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => expect(screen.getByText('Sai mật khẩu')).toBeInTheDocument());
  });

  it('shows fallback error when API returns no message', async () => {
    vi.mocked(authServiceModule.authService.login).mockRejectedValueOnce(new Error('Network error'));

    renderPage();
    await userEvent.type(screen.getByPlaceholderText(/nhập tên đăng nhập/i), 'admin');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() =>
      expect(screen.getByText(/tên đăng nhập hoặc mật khẩu không chính xác/i)).toBeInTheDocument(),
    );
  });

  it('does not call login when fields are empty', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));
    expect(authServiceModule.authService.login).not.toHaveBeenCalled();
  });
});
