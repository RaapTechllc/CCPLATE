// Setting types
export type SettingType = "STRING" | "NUMBER" | "BOOLEAN" | "JSON";

// System setting
export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: SettingType;
  category: string;
  createdAt: string;
  updatedAt: string;
}

// Setting update request
export interface SettingUpdateRequest {
  value: string;
  type?: SettingType;
}

// Bulk setting update
export interface BulkSettingUpdate {
  key: string;
  value: string;
  type?: SettingType;
}

// Settings grouped by category
export interface SettingsByCategory {
  [category: string]: SystemSetting[];
}

// Default settings keys
export const SETTING_KEYS = {
  // General
  SITE_NAME: "site_name",
  SITE_DESCRIPTION: "site_description",
  SITE_URL: "site_url",

  // Features
  REGISTRATION_ENABLED: "registration_enabled",
  EMAIL_VERIFICATION_REQUIRED: "email_verification_required",
  OAUTH_ENABLED: "oauth_enabled",

  // Uploads
  MAX_FILE_SIZE: "max_file_size",
  ALLOWED_FILE_TYPES: "allowed_file_types",

  // Limits
  MAX_FILES_PER_USER: "max_files_per_user",
  MAX_STORAGE_PER_USER: "max_storage_per_user",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

// Default settings values
export const DEFAULT_SETTINGS: Record<
  SettingKey,
  { value: string; type: SettingType; category: string }
> = {
  [SETTING_KEYS.SITE_NAME]: {
    value: "CCPLATE",
    type: "STRING",
    category: "general",
  },
  [SETTING_KEYS.SITE_DESCRIPTION]: {
    value: "Next.js Starter Boilerplate",
    type: "STRING",
    category: "general",
  },
  [SETTING_KEYS.SITE_URL]: {
    value: "http://localhost:3000",
    type: "STRING",
    category: "general",
  },
  [SETTING_KEYS.REGISTRATION_ENABLED]: {
    value: "true",
    type: "BOOLEAN",
    category: "features",
  },
  [SETTING_KEYS.EMAIL_VERIFICATION_REQUIRED]: {
    value: "false",
    type: "BOOLEAN",
    category: "features",
  },
  [SETTING_KEYS.OAUTH_ENABLED]: {
    value: "true",
    type: "BOOLEAN",
    category: "features",
  },
  [SETTING_KEYS.MAX_FILE_SIZE]: {
    value: "10485760",
    type: "NUMBER",
    category: "uploads",
  },
  [SETTING_KEYS.ALLOWED_FILE_TYPES]: {
    value: JSON.stringify([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ]),
    type: "JSON",
    category: "uploads",
  },
  [SETTING_KEYS.MAX_FILES_PER_USER]: {
    value: "100",
    type: "NUMBER",
    category: "limits",
  },
  [SETTING_KEYS.MAX_STORAGE_PER_USER]: {
    value: "104857600",
    type: "NUMBER",
    category: "limits",
  },
};
