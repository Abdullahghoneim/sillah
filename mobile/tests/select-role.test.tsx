import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SelectRole from '@/app/select-role';
import { router } from 'expo-router';

const replace = router.replace as jest.Mock;
const fetchMock = global.fetch as unknown as jest.Mock;

beforeEach(() => {
  replace.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ id: 'u1', role: 'TEACHER' }),
  });
});

describe('Select Role screen', () => {
  test('Next without selection shows error', () => {
    const api = render(<SelectRole />);
    fireEvent.press(api.getByText('Next'));
    expect(api.getByText(/Pick a role/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('Teacher → Next PATCHes /api/users/me with TEACHER and navigates to /(tabs)', async () => {
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
    expect(replace).toHaveBeenCalledWith('/(tabs)');
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
});
