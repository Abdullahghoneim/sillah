import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

jest.mock('@/lib/students-api', () => ({
  acceptInviteToken: jest.fn().mockResolvedValue({
    student: { id: 's-link', name: 'Linked' },
  }),
}));

import SelectRole, { PENDING_INVITE_KEY } from '@/app/select-role';
import { acceptInviteToken } from '@/lib/students-api';

const replace = router.replace as jest.Mock;
const fetchMock = global.fetch as unknown as jest.Mock;
const getItemAsync = SecureStore.getItemAsync as jest.Mock;
const deleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;
const acceptMock = acceptInviteToken as jest.Mock;

beforeEach(() => {
  replace.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ id: 'u1', role: 'STUDENT' }),
  });
  getItemAsync.mockReset();
  getItemAsync.mockResolvedValue(null);
  deleteItemAsync.mockReset();
  deleteItemAsync.mockResolvedValue(undefined);
  acceptMock.mockReset();
  acceptMock.mockResolvedValue({
    student: { id: 's-link', name: 'Linked' },
  });
});

describe('Select Role screen', () => {
  test('Next without selection shows error', () => {
    const api = render(<SelectRole />);
    fireEvent.press(api.getByText('Next'));
    expect(api.getByText(/Pick a role/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('Teacher → Next PATCHes /api/users/me with TEACHER and navigates to /(tabs)/students', async () => {
    const api = render(<SelectRole />);
    fireEvent.press(api.getByText('Teacher'));
    fireEvent.press(api.getByText('Next'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/users/me');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ role: 'TEACHER' });
    expect(replace).toHaveBeenCalledWith('/(tabs)/students');
  });

  test('Parent/Student maps to STUDENT', async () => {
    const api = render(<SelectRole />);
    fireEvent.press(api.getByText('Parent/Student'));
    fireEvent.press(api.getByText('Next'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      role: 'STUDENT',
    });
  });

  test('server error is shown and navigation does not happen', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Not authenticated' }),
    });
    const api = render(<SelectRole />);
    fireEvent.press(api.getByText('Teacher'));
    fireEvent.press(api.getByText('Next'));

    expect(await api.findByText(/Not authenticated/)).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  test('STUDENT path with no pending token: skips accept and navigates to /student-home', async () => {
    const api = render(<SelectRole />);
    fireEvent.press(api.getByText('Parent/Student'));
    fireEvent.press(api.getByText('Next'));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/(tabs)/student-home');
    });
    expect(getItemAsync).toHaveBeenCalledWith(PENDING_INVITE_KEY);
    expect(acceptMock).not.toHaveBeenCalled();
    expect(deleteItemAsync).not.toHaveBeenCalled();
  });

  test('STUDENT path with pending token: accepts it, clears SecureStore, then navigates', async () => {
    getItemAsync.mockResolvedValueOnce('pending-token-xyz');

    const api = render(<SelectRole />);
    fireEvent.press(api.getByText('Parent/Student'));
    fireEvent.press(api.getByText('Next'));

    await waitFor(() => {
      expect(acceptMock).toHaveBeenCalledWith('pending-token-xyz');
    });
    expect(deleteItemAsync).toHaveBeenCalledWith(PENDING_INVITE_KEY);
    expect(replace).toHaveBeenCalledWith('/(tabs)/student-home');
  });

  test('STUDENT path: accept failure still clears storage and navigates', async () => {
    getItemAsync.mockResolvedValueOnce('expired-token');
    acceptMock.mockRejectedValueOnce(new Error('EXPIRED_TOKEN'));

    const api = render(<SelectRole />);
    fireEvent.press(api.getByText('Parent/Student'));
    fireEvent.press(api.getByText('Next'));

    await waitFor(() => {
      expect(deleteItemAsync).toHaveBeenCalledWith(PENDING_INVITE_KEY);
    });
    expect(replace).toHaveBeenCalledWith('/(tabs)/student-home');
  });

  test('TEACHER path: does not read or write the invite SecureStore', async () => {
    const api = render(<SelectRole />);
    fireEvent.press(api.getByText('Teacher'));
    fireEvent.press(api.getByText('Next'));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/(tabs)/students');
    });
    expect(getItemAsync).not.toHaveBeenCalled();
    expect(acceptMock).not.toHaveBeenCalled();
  });
});
