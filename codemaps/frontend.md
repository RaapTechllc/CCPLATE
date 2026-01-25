# CCPLATE Frontend Codemap

> Generated: 2026-01-25T00:00:00Z
> Freshness: CURRENT

## App Router Structure (src/app/)

```
src/app/
├── layout.tsx                    # Root layout
├── page.tsx                      # Home page
├── (auth)/                       # Auth route group
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/[token]/page.tsx
│   └── verify-email/[token]/page.tsx
├── (protected)/                  # Authenticated routes
│   ├── layout.tsx
│   ├── agent-builder/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── api-builder/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── component-builder/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── hook-builder/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── prompt-builder/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── schema-builder/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── guardian/
│       ├── layout.tsx
│       ├── page.tsx              # Dashboard
│       ├── timeline/
│       │   ├── page.tsx
│       │   ├── timeline-content.tsx
│       │   ├── actions.ts
│       │   └── types.ts
│       ├── worktrees/
│       │   ├── worktrees-client.tsx
│       │   └── actions.ts
│       └── actions.ts
├── (app)/                        # App route group
│   └── guardian/
│       ├── layout.tsx
│       └── agents/
│           ├── page.tsx
│           └── actions.ts
└── admin/                        # Admin pages
    ├── page.tsx
    ├── settings/page.tsx
    └── users/
        ├── page.tsx
        └── [id]/
            ├── page.tsx
            └── user-detail-client.tsx
```

## Component Library (src/components/)

### UI Components (src/components/ui/)
| Component | Purpose |
|-----------|---------|
| `button.tsx` | Button variants |
| `card.tsx` | Card container |
| `input.tsx` | Form input |
| `label.tsx` | Form label |
| `switch.tsx` | Toggle switch |
| `spinner.tsx` | Loading spinner |
| `avatar-upload.tsx` | Avatar upload |
| `code-block.tsx` | Code display |
| `file-upload.tsx` | File upload |
| `file-list.tsx` | File listing |
| `toaster.tsx` | Toast notifications |

### Layout Components (src/components/layout/)
| Component | Purpose |
|-----------|---------|
| `header.tsx` | App header |
| `footer.tsx` | App footer |
| `navigation.tsx` | Main navigation |
| `user-menu.tsx` | User dropdown menu |
| `index.ts` | Layout exports |

### Feature Components (src/components/features/)

#### Auth Features
| Component | Purpose |
|-----------|---------|
| `login-form.tsx` | Login form |
| `register-form.tsx` | Registration form |
| `forgot-password-form.tsx` | Password reset request |
| `reset-password-form.tsx` | Password reset form |
| `oauth-buttons.tsx` | OAuth provider buttons |

#### Profile Features
| Component | Purpose |
|-----------|---------|
| `profile-name-form.tsx` | Name update |
| `profile-password-form.tsx` | Password change |
| `profile-avatar-form.tsx` | Avatar upload |
| `email-verification-banner.tsx` | Email verification |

#### Guardian Features
| Component | Purpose |
|-----------|---------|
| `agent-card.tsx` | Agent display card |
| `worktree-card.tsx` | Worktree status card |
| `timeline-event.tsx` | Timeline event item |
| `create-worktree-modal.tsx` | Worktree creation |
| `confirm-dialog.tsx` | Confirmation dialogs |

#### Agent Builder Features
| Component | Purpose |
|-----------|---------|
| `agent-editor.tsx` | Agent configuration editor |
| `agent-list.tsx` | Agent listing |
| `agent-chat.tsx` | Agent chat interface |
| `tool-editor.tsx` | Tool configuration |
| `tool-selector.tsx` | Tool selection |
| `index.ts` | Exports |

#### API Builder Features
| Component | Purpose |
|-----------|---------|
| `api-input.tsx` | API spec input |
| `api-options.tsx` | Generation options |
| `code-preview.tsx` | Generated code preview |
| `endpoint-preview.tsx` | Endpoint preview |
| `index.ts` | Exports |

#### Component Builder Features
| Component | Purpose |
|-----------|---------|
| `component-input.tsx` | Component spec input |
| `options-panel.tsx` | Generation options |
| `code-preview.tsx` | Generated code |
| `props-preview.tsx` | Props interface preview |
| `index.ts` | Exports |

#### Hook Builder Features
| Component | Purpose |
|-----------|---------|
| `hook-builder-form.tsx` | Hook specification |
| `hook-preview.tsx` | Generated hook preview |
| `index.ts` | Exports |

#### Prompt Builder Features
| Component | Purpose |
|-----------|---------|
| `prompt-editor.tsx` | Prompt editing |
| `prompt-list.tsx` | Prompt listing |
| `variable-editor.tsx` | Variable configuration |
| `test-panel.tsx` | Prompt testing |
| `version-history.tsx` | Version history |
| `index.ts` | Exports |

#### Schema Builder Features
| Component | Purpose |
|-----------|---------|
| `schema-input.tsx` | Schema specification |
| `model-preview.tsx` | Model preview |
| `model-history.tsx` | Version history |
| `schema-diff.tsx` | Schema diff display |
| `index.ts` | Exports |

#### Files Features
| Component | Purpose |
|-----------|---------|
| `file-upload-section.tsx` | Upload UI |
| `files-table.tsx` | File listing table |

### Admin Components (src/components/admin/)
| Component | Purpose |
|-----------|---------|
| `admin-sidebar.tsx` | Admin navigation |
| `stats-card.tsx` | Statistics display |
| `users-table.tsx` | User management table |
| `user-form.tsx` | User edit form |
| `settings-form.tsx` | Settings form |

### Shared Components
| Component | Purpose |
|-----------|---------|
| `providers.tsx` | Context providers |
| `error-boundary.tsx` | Error boundary |
| `loading.tsx` | Loading state |
| `seo.tsx` | SEO metadata |

## Custom Hooks (src/hooks/)

| Hook | Purpose |
|------|---------|
| `use-admin-stats.ts` | Admin statistics |
| `use-admin-users.ts` | User management |
| `use-file-upload.ts` | File upload state |
| `use-settings.ts` | System settings |

## Component Patterns

### Server vs Client Components
- **Server (default):** Layouts, pages, data fetching
- **Client ("use client"):** Interactive forms, state management

### Data Fetching
- Server Actions in `actions.ts` files
- React Query for client-side caching (via hooks)
- Direct API calls for mutations

### Styling
- Tailwind CSS utility classes
- Component-level variants via props
- No CSS modules or styled-components
