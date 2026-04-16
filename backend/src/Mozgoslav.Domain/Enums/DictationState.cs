namespace Mozgoslav.Domain.Enums;

/// <summary>
/// Lifecycle states of a single push-to-talk dictation session. The happy path
/// cycles Idle → Recording → Processing → Injecting → Idle; a failure anywhere
/// transitions to <see cref="Error"/> and the manager forgets the session.
/// </summary>
public enum DictationState
{
    Idle,
    Recording,
    Processing,
    Injecting,
    Error
}
