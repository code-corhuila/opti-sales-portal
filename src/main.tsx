// A portal is not an application: it is mounted by opti-front, which owns the session and the HTTP client.
const root = document.getElementById('root');
if (root) {
  root.textContent = 'This is the sales portal of OptiView. It runs inside opti-front (see the README).';
}
