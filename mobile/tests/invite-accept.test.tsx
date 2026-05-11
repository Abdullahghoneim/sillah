import { fireEvent, render, waitFor, act } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import AcceptInvite, { PENDING_INVITE_KEY } from '@/app/invite/accept';
import { authClient } from '@/lib/auth-client';

jest.mock('@/lib/students-api', () => ({
  acceptInviteToken: jest.fn(),
}));

import { acceptInviteToken } from '@/lib/students-api';

const replace = router.replace as jest.Mock;
const useParams = useLocalSearchParams as jest.Mock;
const useSession = authClient.useSession as jest.Mock;
const setItemAsync = SecureStore.setItemAsync as jest.Mock;
const deleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;
const acceptMock = acceptInviteToken as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useParams.mockReturnValue({ token: 'tok-abc-123' });
  useSession.mockReturnValue({ data: null, isPending: false });
  setItemAsync.mockResolvedValue(undefined);
  deleteItemAsync.mockResolvedValue(undefined);
});

describe('Accept Invite screen', () => {
  test('shows error state when no token is in the URL', () => {
    useParams.mockReturnValue({});
    const api = render(<AcceptInvite />);
    expect(api.getByText(/missing a token/i)).toBeTruthy();
  });

  test('when no session: stores token in SecureStore and shows create-account UI', async () => {
    const api = render(<AcceptInvite />);

    await waitFor(() => {
      expect(setItemAsync).toHaveBeenCalledWith(
        PENDING_INVITE_KEY,
        'tok-abc-123',
      );
    });
    expect(api.getByText("You've been invited!")).toBeTruthy();
    expect(api.getByText('Create Account')).toBeTruthy();
    expect(api.getByText(/I already have an account/i)).toBeTruthy();
  });

  test('no session: tapping "Create Account" navigates to /register', async () => {
    const api = render(<AcceptInvite />);
    await waitFor(() => expect(setItemAsync).toHaveBeenCalled());

    fireEvent.press(api.getByText('Create Account'));
    expect(replace).toHaveBeenCalledWith('/register');
  });

  test('TEACHER session: shows the wrong-role screen and does not call accept', async () => {
    useSession.mockReturnValue({
      data: { user: { id: 't1', role: 'TEACHER' } },
      isPending: false,
    });

    const api = render(<AcceptInvite />);

    await waitFor(() => {
      expect(api.getByText(/invite is for a student/i)).toBeTruthy();
    });
    expect(acceptMock).not.toHaveBeenCalled();
  });

  test('STUDENT session: accepts the token and navigates to /(tabs)/student-home', async () => {
    useSession.mockReturnValue({
      data: { user: { id: 's1', role: 'STUDENT' } },
      isPending: false,
    });
    acceptMock.mockResolvedValue({
      student: { id: 's-link', name: 'Rahma Ahmed' },
    });

    jest.useFakeTimers();
    const api = render(<AcceptInvite />);

    await waitFor(() => {
      expect(acceptMock).toHaveBeenCalledWith('tok-abc-123');
    });
    await waitFor(() => {
      expect(api.getByText(/Welcome, Rahma Ahmed/)).toBeTruthy();
    });
    expect(deleteItemAsync).toHaveBeenCalledWith(PENDING_INVITE_KEY);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(replace).toHaveBeenCalledWith('/(tabs)/student-home');
    jest.useRealTimers();
  });

  test('STUDENT session: EXPIRED_TOKEN renders the expired error message', async () => {
    useSession.mockReturnValue({
      data: { user: { id: 's1', role: 'STUDENT' } },
      isPending: false,
    });
    acceptMock.mockRejectedValue(new Error('EXPIRED_TOKEN'));

    const api = render(<AcceptInvite />);
    expect(await api.findByText(/expired/i)).toBeTruthy();
  });

  test('STUDENT session: INVALID_TOKEN renders the invalid error message', async () => {
    useSession.mockReturnValue({
      data: { user: { id: 's1', role: 'STUDENT' } },
      isPending: false,
    });
    acceptMock.mockRejectedValue(new Error('INVALID_TOKEN'));

    const api = render(<AcceptInvite />);
    expect(await api.findByText(/no longer valid/i)).toBeTruthy();
  });

  test('STUDENT session: generic error shows the friendly fallback message', async () => {
    useSession.mockReturnValue({
      data: { user: { id: 's1', role: 'STUDENT' } },
      isPending: false,
    });
    acceptMock.mockRejectedValue(new Error('boom'));

    const api = render(<AcceptInvite />);
    expect(await api.findByText(/boom|Could not accept/i)).toBeTruthy();
  });

  test('does not attempt to accept while session is still loading', () => {
    useSession.mockReturnValue({ data: null, isPending: true });
    render(<AcceptInvite />);
    expect(acceptMock).not.toHaveBeenCalled();
    expect(setItemAsync).not.toHaveBeenCalled();
  });
});
