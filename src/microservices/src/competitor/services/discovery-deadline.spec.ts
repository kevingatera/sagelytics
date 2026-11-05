import { Deadline, DeadlineExceededError, runWithDeadline } from './discovery-deadline';

// Finding 1 and 4: every provider call sits under a deadline that stops dispatch and waiting.
describe('Deadline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('gives children the parent expiry and aborts them with it', () => {
    const budget = Deadline.root('budget', 10_000);
    jest.advanceTimersByTime(4_000);
    const stage = budget.child('stage', 60_000);

    expect(stage.expiresAt).toBe(budget.expiresAt);
    expect(stage.remainingMs()).toBe(6_000);

    jest.advanceTimersByTime(6_000);
    expect(budget.expired).toBe(true);
    expect(stage.signal.aborted).toBe(true);
    expect(stage.signal.reason).toBeInstanceOf(DeadlineExceededError);

    budget.dispose();
    stage.dispose();
  });

  it('never starts a task once the budget is spent', async () => {
    const budget = Deadline.root('budget', 1_000);
    jest.advanceTimersByTime(1_000);
    const task = jest.fn(async () => 'value');

    await expect(runWithDeadline(budget, 5_000, 'call', task)).rejects.toThrow(
      DeadlineExceededError,
    );
    expect(task).not.toHaveBeenCalled();

    budget.dispose();
  });

  it('stops waiting at its own deadline even when the provider ignores the signal', async () => {
    const budget = Deadline.root('budget', 60_000);
    const started = Date.now();
    const outcome = runWithDeadline(
      budget,
      2_000,
      'hanging call',
      () => new Promise<never>(() => undefined),
    ).then(
      () => 'resolved',
      (error: unknown) => error,
    );

    await jest.advanceTimersByTimeAsync(2_000);

    expect(await outcome).toBeInstanceOf(DeadlineExceededError);
    expect(Date.now() - started).toBe(2_000);

    budget.dispose();
  });

  it('hands the provider a signal that it can use to cancel', async () => {
    const budget = Deadline.root('budget', 60_000);
    let seenSignal: AbortSignal | undefined;
    const outcome = runWithDeadline(budget, 1_000, 'cooperative call', (scope) => {
      seenSignal = scope.signal;
      return new Promise<never>((_, reject) =>
        scope.signal.addEventListener('abort', () => reject(scope.signal.reason)),
      );
    }).then(
      () => 'resolved',
      (error: unknown) => error,
    );

    await jest.advanceTimersByTimeAsync(1_000);

    expect(await outcome).toBeInstanceOf(DeadlineExceededError);
    expect(seenSignal?.aborted).toBe(true);

    budget.dispose();
  });
});
