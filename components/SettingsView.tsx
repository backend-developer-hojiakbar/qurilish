import React, { useState, useEffect } from 'react';
import { ComputerDesktopIcon } from './icons';
import { getProfile, updateProfile } from '../services/apiService';

interface SettingsViewProps {
    t: (key: string, replacements?: { [key: string]: string }) => string;
    deviceId: string | null;
    deviceList: string[];
    onRemoveDevice: (deviceId: string) => void;
}

const SettingsCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="polished-pane">
        <div className="p-4 border-b border-[var(--border-color)]">
            <h3 className="font-semibold text-lg text-slate-200">{title}</h3>
        </div>
        <div className="p-4">
            {children}
        </div>
    </div>
);

const InputField: React.FC<{ 
    label: string; 
    type: string; 
    id: string; 
    value: string; 
    onChange?: (value: string) => void;
    disabled?: boolean 
}> = ({ label, type, id, value, onChange, disabled }) => (
     <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">
            {label}
        </label>
        <input
            id={id}
            name={id}
            type={type}
            required
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
            disabled={disabled}
            className="block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:opacity-50"
        />
    </div>
);

export const SettingsView: React.FC<SettingsViewProps> = ({ t, deviceId, deviceList, onRemoveDevice }) => {
    const [profile, setProfile] = useState({
        username: '',
        email: '',
        phone_number: '',
        full_name: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Load profile data on component mount
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const profileData = await getProfile();
                setProfile({
                    username: profileData.username || '',
                    email: profileData.email || '',
                    phone_number: profileData.phone_number || '',
                    full_name: profileData.full_name || ''
                });
            } catch (error) {
                console.error("Failed to load profile:", error);
            }
        };

        loadProfile();
    }, []);

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await updateProfile(profile);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update profile:", error);
            alert(t('error_generic_title'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-assemble-in">
            {deviceId && (
                <div className="polished-pane p-4 flex items-center gap-4">
                    <ComputerDesktopIcon className="h-8 w-8 text-[var(--accent-primary)]"/>
                    <div>
                        <h3 className="font-semibold text-slate-200">{t('settings_devices_current_device')}</h3>
                        <p className="font-mono text-sm text-[var(--text-secondary)] tracking-wider">{deviceId}</p>
                    </div>
                </div>
            )}

            <SettingsCard title={t('settings_profile_title')}>
                <form className="space-y-4">
                    <InputField 
                        label={t('settings_profile_name')} 
                        id="full-name" 
                        type="text" 
                        value={profile.full_name} 
                        onChange={(value) => setProfile({...profile, full_name: value})}
                        disabled={!isEditing}
                    />
                    <InputField 
                        label={t('settings_profile_phone')} 
                        id="phone" 
                        type="tel" 
                        value={profile.phone_number} 
                        onChange={(value) => setProfile({...profile, phone_number: value})}
                        disabled={!isEditing}
                    />
                    <div className="flex gap-2 pt-2">
                        {isEditing ? (
                            <>
                                <button 
                                    type="button"
                                    onClick={handleSaveProfile}
                                    disabled={saving}
                                    className="bg-[var(--accent-primary)] text-black font-bold py-2 px-5 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? t('button_saving') : t('button_save')}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold py-2 px-5 rounded-lg transition-transform transform hover:scale-105"
                                >
                                    {t('button_cancel')}
                                </button>
                            </>
                        ) : (
                            <button 
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="bg-[var(--accent-primary)] text-black font-bold py-2 px-5 rounded-lg transition-transform transform hover:scale-105"
                            >
                                {t('button_change')}
                            </button>
                        )}
                    </div>
                </form>
            </SettingsCard>

            <SettingsCard title={t('settings_devices_title')}>
                <div className="space-y-4">
                    <p className="text-sm text-[var(--text-secondary)]">{t('settings_devices_limit_info')}</p>
                    <div className="space-y-2">
                        {deviceList.map((id) => (
                            <div key={id} className="flex items-center justify-between bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-color)]">
                                <div className="flex items-center gap-3">
                                    <ComputerDesktopIcon className="h-5 w-5 text-slate-400" />
                                    <span className="font-mono text-sm text-slate-300">{id}</span>
                                    {id === deviceId && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
                                            {t('device_current_tag')}
                                        </span>
                                    )}
                                </div>
                                {id !== deviceId && (
                                    <button
                                        onClick={() => onRemoveDevice(id)}
                                        className="text-sm font-semibold text-red-400 hover:text-red-300 hover:underline"
                                    >
                                        {t('button_remove_device')}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </SettingsCard>

             <SettingsCard title={t('settings_notifications_title')}>
                <p className="text-[var(--text-secondary)]">{t('settings_notifications_placeholder')}</p>
            </SettingsCard>
        </div>
    );
};