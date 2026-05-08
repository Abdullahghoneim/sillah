import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Login from '@/app/login';
import { authClient } from '@/lib/auth-client';
import { router } from 'expo-router';

const sendOtp = authClient.emailOtp.sendVerificationOtp as jest.Mock;
const push = router.push as jest.Mock;

beforeEach(() => {
  sendOtp.mockReset();
  sendOtp.mockResolvedValue({ error: null });
  push.mockReset();
});

describe('Login screen', () => {
  test('shows email error when submitted empty', () => {
    const { getByText } = render(<Login />);
    fireEvent.press(getByText('Continue'));
    expect(getByText('Enter your email')).toBeTruthy();
    expect(sendOtp).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  test('shows format error for malformed email', () => {
    const { getByText, getByPlaceholderText } = render(<Login />);
    fireEvent.changeText(getByPlaceholderText(/example/i), 'not-an-email');
    fireEvent.press(getByText('Continue'));
    expect(getByText(/valid email/i)).toBeTruthy();
    expect(sendOtp).not.toHaveBeenCalled();
  });

  test('valid email triggers send-OTP and navigates to /verify with mode=signin', async () => {
    const { getByText, getByPlaceholderText } = render(<Login />);
    fireEvent.changeText(
      getByPlaceholderText(/example/i),
      'Ehsan@Example.com',
    );
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(sendOtp).toHaveBeenCalledWith({
        email: 'ehsan@example.com',
        type: 'sign-in',
      });
      expect(push).toHaveBeenCalledWith({
        pathname: '/verify',
        params: { email: 'ehsan@example.com', mode: 'signin' },
      });
    });
  });

  test('server error from sendVerificationOtp is mapped to friendly text', async () => {
    sendOtp.mockResolvedValueOnce({
      error: { message: 'User not found' },
    });
    const { findByText, getByText, getByPlaceholderText } = render(<Login />);
    fireEvent.changeText(getByPlaceholderText(/example/i), 'a@b.co');
    fireEvent.press(getByText('Continue'));

    expect(await findByText(/couldn.t find an account/i)).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  test('"Create an account" navigates to /register', () => {
    const { getByText } = render(<Login />);
    fireEvent.press(getByText('Create an account'));
    expect(push).toHaveBeenCalledWith('/register');
  });
});
