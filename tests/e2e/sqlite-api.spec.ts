import { test, expect } from '@playwright/test';

test.describe('SQLite 存储 API', () => {
  test('GET /api/store/info/all 返回数组', async ({ request }) => {
    const res = await request.get('/api/store/info/all');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /api/store/debug/all 返回数组', async ({ request }) => {
    const res = await request.get('/api/store/debug/all');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /api/store/article/hit-cache 缺少参数返回 {hit: false}', async ({ request }) => {
    const res = await request.get('/api/store/article/hit-cache');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ hit: false });
  });

  test('GET /api/store/article/cache 缺少参数返回空数组', async ({ request }) => {
    const res = await request.get('/api/store/article/cache');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  test('GET /api/store/article/by-link 缺少参数返回 204', async ({ request }) => {
    const res = await request.get('/api/store/article/by-link');
    expect(res.status()).toBe(204);
  });

  test('GET /api/store/html/get 缺少参数返回 204', async ({ request }) => {
    const res = await request.get('/api/store/html/get');
    expect(res.status()).toBe(204);
  });

  test('GET /api/store/info/get 缺少参数返回 204', async ({ request }) => {
    const res = await request.get('/api/store/info/get');
    expect(res.status()).toBe(204);
  });

  test('GET /api/store/comment/get 缺少参数返回 204', async ({ request }) => {
    const res = await request.get('/api/store/comment/get');
    expect(res.status()).toBe(204);
  });

  test('GET /api/store/metadata/get 缺少参数返回 204', async ({ request }) => {
    const res = await request.get('/api/store/metadata/get');
    expect(res.status()).toBe(204);
  });

  test('GET /api/store/resource/get 缺少参数返回 204', async ({ request }) => {
    const res = await request.get('/api/store/resource/get');
    expect(res.status()).toBe(204);
  });
});
