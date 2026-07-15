process.env.PROCESS_ROLE = 'worker';

void import('./worker/main').then(({ workerMain }) =>
  workerMain().catch(() => {
    console.error('Worker failed to start. See privacy-safe service logs for the failure code.');
    process.exitCode = 1;
  })
);
