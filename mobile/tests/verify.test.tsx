import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Verify from '@/app/verify';
import { authClient } from '@/lib/auth-client';
import { router, useLocalSearchParams } from 'expo-router';

const signInOtp = authClient.signIn.emailOtp as jest.Mock;
const sendOtp = authClient.emailOtp.sendVerificationOtp as jest.Mock;
const replace = router.replace as jest.Mock;
const useParams = useLocalSearchParams as unknown as jest.Mock;

beforeEach(() => {
  signInOtp.mockReset();
  signInOtp.mockResolvedValue({ error: null });
  sendOtp.mockReset();
  sendOtp.mockResolvedValue({ error: null });
  replace.mockReset();
  useParams.mockReset();
});

function setParams(params: Record<string, string>) {
  useParams.mockReturnValue(params);
}

function getOtpInputs(api: ReturnType<typeof render>) {
  return api.UNSAFE_getAllByType(
    require('react-native').TextInput,
  ).filter((n: any) => n.props.maxLength === 6);
}

describe('Verify screen', () => {
  test('shows error when submitted with no code', async () => {
    setParams({ email: 'a@b.co', mode: 'signin' });
    const api = render(<Verify />);
    fireEvent.press(api.getByText('Sign In'));
    expect(await api.findByText(/6-digit code/i)).toBeTruthy();
    expect(signInOtp).not.toHaveBeenCalled();
  });

  test('signin success replaces to /(tabs)', async () => {
    setParams({ email: 'a@b.co', mode: 'signin' });
    const api = render(<Verify />);
    const inputs = getOtpInputs(api);
    inputs.forEach((node, i) =>
      fireEvent.changeText(node, String((i + 1) % 10)),
    );
    fireEvent.press(api.getByText('Sign In'));

    await waitFor(() => {
      expect(signInOtp).toHaveBeenCalledWith({
        email: 'a@b.co',
        otp: '123456',
      });
      expect(replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  test('signup success replaces to /select-role', async () => {
    setParams({ email: 'a@b.co', mode: 'signup' });
    const api = render(<Verify />);
    const inputs = getOtpInputs(api);
    inputs.forEach((node, i) =>
      fireEvent.changeText(node, String((i + 1) % 10)),
    );
    fireEvent.press(api.getByText('Verify'));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/select-role');
    });
  });

  test('paste of full code into the first box fans across all 6 boxes', async () => {
    setParams({ email: 'a@b.co', mode: 'signin' });
    const api = render(<Verify />);
    const inputs = getOtpInputs(api);
    fireEvent.changeText(inputs[0], '123456');
    fireEvent.press(api.getByText('Sign In'));

    await waitFor(() => {
      expect(signInOtp).toHaveBeenCalledWith({
        email: 'a@b.co',
        otp: '123456',
      });
    });
  });

  test('Resend triggers sendVerificationOtp and shows confirmation', async () => {
    setParams({ email: 'a@b.co', mode: 'signin' });
    const api = render(<Verify />);
    fireEvent.press(api.getByText('Resend'));

    await waitFor(() => {
      expect(sendOtp).toHaveBeenCalledWith({
        email: 'a@b.co',
        type: 'sign-in',
      });
    });
    expect(await api.findByText(/fresh code is on its way/i)).toBeTruthy();
  });

  test('invalid code from server is mapped to friendly text', async () => {
    setParams({ email: 'a@b.co', mode: 'signin' });
    signInOtp.mockResolvedValueOnce({
      error: { message: 'Invalid OTP' },
    });
    const api = render(<Verify />);
    const inputs = getOtpInputs(api);
    inputs.forEach((node, i) => fireEvent.changeText(node, String(i)));
    fireEvent.press(api.getByText('Sign In'));

    expect(await api.findByText(/incorrect/i)).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
