import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Register from '@/app/register';
import { authClient, registerUser } from '@/lib/auth-client';
import { router } from 'expo-router';

const sendOtp = authClient.emailOtp.sendVerificationOtp as jest.Mock;
const register = registerUser as unknown as jest.Mock;
const push = router.push as jest.Mock;

beforeEach(() => {
  sendOtp.mockReset();
  sendOtp.mockResolvedValue({ error: null });
  register.mockReset();
  register.mockResolvedValue({
    user: { id: 'u1', email: 'test@example.com' },
    otpRequired: true,
  });
  push.mockReset();
});

function fillRequired(api: ReturnType<typeof render>) {
  fireEvent.changeText(
    api.getByPlaceholderText('Ehsan Mohamed'),
    'Ehsan Mohamed',
  );
  fireEvent.changeText(
    api.getByPlaceholderText('Ehsan@example.com'),
    'Ehsan@Example.com',
  );
  fireEvent.changeText(api.getByPlaceholderText(/\+20/), '01062067188');
}

describe('Register screen', () => {
  test('shows per-field errors when submitted empty', () => {
    const api = render(<Register />);
    fireEvent.press(api.getByText('Continue'));
    expect(api.getByText('Enter your full name')).toBeTruthy();
    expect(api.getByText('Enter your email')).toBeTruthy();
    expect(api.getByText('Enter your phone number')).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  test('rejects malformed email and short phone individually', () => {
    const api = render(<Register />);
    fireEvent.changeText(api.getByPlaceholderText('Ehsan Mohamed'), 'A');
    fireEvent.changeText(api.getByPlaceholderText('Ehsan@example.com'), 'bad');
    fireEvent.changeText(api.getByPlaceholderText(/\+20/), '+1');
    fireEvent.press(api.getByText('Continue'));

    expect(api.getByText(/at least 2/)).toBeTruthy();
    expect(api.getByText(/valid email/i)).toBeTruthy();
    expect(api.getByText(/too short/i)).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  test('blocks submit when terms checkbox is unchecked', () => {
    const api = render(<Register />);
    fillRequired(api);
    // terms is checked by default; tap to uncheck
    fireEvent.press(api.getByText(/By creating an account/));
    fireEvent.press(api.getByText('Continue'));
    expect(api.getByText(/must accept the Terms/i)).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  test('happy path: registers, sends OTP, navigates to /verify with mode=signup', async () => {
    const api = render(<Register />);
    fillRequired(api);
    fireEvent.press(api.getByText('Continue'));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        name: 'Ehsan Mohamed',
        email: 'ehsan@example.com',
        phone: '01062067188',
        acceptTerms: true,
      });
      expect(sendOtp).toHaveBeenCalledWith({
        email: 'ehsan@example.com',
        type: 'sign-in',
      });
      expect(push).toHaveBeenCalledWith({
        pathname: '/verify',
        params: { email: 'ehsan@example.com', mode: 'signup' },
      });
    });
  });

  test('"already registered" server error is shown next to the email field', async () => {
    register.mockRejectedValueOnce(new Error('Email already registered'));
    const api = render(<Register />);
    fillRequired(api);
    fireEvent.press(api.getByText('Continue'));

    expect(await api.findByText(/already registered/i)).toBeTruthy();
    expect(sendOtp).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
