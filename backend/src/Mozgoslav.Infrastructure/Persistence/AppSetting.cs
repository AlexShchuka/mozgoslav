namespace Mozgoslav.Infrastructure.Persistence;

/// <summary>
/// Key/value row in the persisted app-settings table. Consumed by
/// <see cref="Services.EfAppSettings"/>.
/// </summary>
public sealed class AppSetting
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}
