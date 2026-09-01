// Minimal client-side interactivity
document.addEventListener('DOMContentLoaded', () => {
  // Config Dry Run Test button handler
  const testBtn = document.getElementById('test-config-btn');
  const testOutput = document.getElementById('test-config-output');

  if (testBtn && testOutput) {
    testBtn.addEventListener('click', async () => {
      testBtn.disabled = true;
      testBtn.textContent = 'Running Diagnostics...';
      testOutput.style.display = 'block';
      testOutput.innerHTML = '<p class="text-sm">Connecting to Discord and testing role permissions...</p>';

      try {
        const res = await fetch('/api/admin/config/test', { method: 'POST' });
        const data = await res.json();

        if (data.valid) {
          testOutput.innerHTML = `
            <div class="alert alert-success" style="margin-top: 1rem;">
              <strong>All Checks Passed!</strong> The bot has Manage Roles permission, sits above the target roles in hierarchy, and channels are verified.
            </div>
          `;
        } else {
          const errorList = (data.errors || []).map(e => `<li>${e}</li>`).join('');
          testOutput.innerHTML = `
            <div class="alert alert-danger" style="margin-top: 1rem; flex-direction: column; align-items: flex-start;">
              <strong>Configuration Warnings Detected:</strong>
              <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">${errorList}</ul>
            </div>
          `;
        }
      } catch (err) {
        testOutput.innerHTML = '<div class="alert alert-danger">Failed to run test. Server error.</div>';
      } finally {
        testBtn.disabled = false;
        testBtn.textContent = 'Test Configuration';
      }
    });
  }

  // Copy Verification Link handler
  document.querySelectorAll('.copy-link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const link = btn.getAttribute('data-link');
      if (link) {
        navigator.clipboard.writeText(link).then(() => {
          const original = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = original; }, 2000);
        });
      }
    });
  });
});
