import { useState } from 'react'
import { LogOut, Lock, Mail, User, ArrowLeft, Upload, Eye, EyeOff } from 'lucide-react'
import { UserAccount } from '../types'

interface ProfilePageProps {
  user: UserAccount
  onBack: () => void
  onSignOut: () => void
  onUpdateUser: (updated: UserAccount) => void
}

interface FormErrors {
  [key: string]: string
}

export default function ProfilePage({ user, onBack, onSignOut, onUpdateUser }: ProfilePageProps) {
  const [editedProfile, setEditedProfile] = useState<UserAccount>(user)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleProfileChange = (field: keyof UserAccount, value: string) => {
    setEditedProfile((prev) => ({
      ...prev,
      [field]: value,
    }))
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: '',
      }))
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = () => {
    const errors: FormErrors = {}

    if (!editedProfile.name.trim()) {
      errors.name = 'Name is required'
    }
    if (!editedProfile.email.trim()) {
      errors.email = 'Email is required'
    } else if (!validateEmail(editedProfile.email)) {
      errors.email = 'Please enter a valid email'
    }

    if (Object.keys(errors).length === 0) {
      onUpdateUser(editedProfile)
      setIsEditing(false)
      setAvatarPreview(null)
      setFormErrors({})
    } else {
      setFormErrors(errors)
    }
  }

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleUpdatePassword = () => {
    const errors: FormErrors = {}

    if (!passwordData.current) {
      errors.current = 'Current password is required'
    }
    if (!passwordData.new) {
      errors.new = 'New password is required'
    } else if (passwordData.new.length < 8) {
      errors.new = 'Password must be at least 8 characters'
    }
    if (!passwordData.confirm) {
      errors.confirm = 'Please confirm your password'
    } else if (passwordData.new !== passwordData.confirm) {
      errors.confirm = 'Passwords do not match'
    }

    if (Object.keys(errors).length === 0) {
      setPasswordData({ current: '', new: '', confirm: '' })
      setFormErrors({})
      alert('Password updated successfully')
    } else {
      setFormErrors(errors)
    }
  }

  const getAvatarColors = (initials: string) => {
    const colors = ['bg-amber-500', 'bg-orange-500', 'bg-red-500', 'bg-rose-500']
    const index = initials.charCodeAt(0) % colors.length
    return colors[index]
  }

  // Compute initials from user name
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-background text-foreground font-['DM_Sans']">
      {/* Header – matches History page */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back</span>
          </button>
          {/* <Logo size="text-lg" /> */}
          <div className="w-20"></div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-card border border-border p-6 shadow-sm">
              {/* Avatar Section */}
              <div className="mb-6 flex flex-col items-center">
                <div
                  className={`${getAvatarColors(initials)} relative mb-4 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg`}
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <h2 className="text-center text-lg font-semibold text-foreground">
                  {user.name}
                </h2>
                <p className="text-center text-sm text-muted-foreground">{user.email}</p>
              </div>

              {/* Navigation Tabs */}
              <nav className="space-y-2 border-t border-border pt-6">
                <button
                  onClick={() => { setActiveTab('profile'); setIsEditing(false) }}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Profile Info</span>
                </button>
                <button
                  onClick={() => { setActiveTab('password'); setIsEditing(false) }}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'password'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  <span>Password</span>
                </button>
              </nav>

              {/* Sign Out Button */}
              <button
                onClick={onSignOut}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="rounded-lg bg-card border border-border p-8 shadow-sm">
              {activeTab === 'profile' ? (
                <>
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-['Playfair_Display'] font-bold text-foreground">Profile Information</h2>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-accent"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mb-6 rounded-lg bg-blue-50/80 p-4 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                      Update your profile information below
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Avatar Upload */}
                    {isEditing && (
                      <div className="border-b border-border pb-6">
                        <label className="block text-sm font-medium text-foreground">
                          Profile Picture
                        </label>
                        <div className="mt-4 flex items-center gap-6">
                          <div
                            className={`${getAvatarColors(initials)} flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white`}
                          >
                            {avatarPreview ? (
                              <img
                                src={avatarPreview}
                                alt="Avatar preview"
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60">
                            <Upload className="h-4 w-4" />
                            <span>Upload Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Name Field */}
                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        Full Name
                      </label>
                      <div className="relative mt-2">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={editedProfile.name}
                          onChange={(e) => handleProfileChange('name', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full rounded-lg border px-4 py-3 pl-10 text-sm transition-colors ${
                            isEditing
                              ? 'border-border bg-background focus:border-accent focus:outline-none'
                              : 'border-border/50 bg-secondary/30 text-muted-foreground'
                          } ${formErrors.name ? 'border-destructive' : ''}`}
                          placeholder="Enter your full name"
                        />
                      </div>
                      {formErrors.name && <p className="mt-1 text-xs text-destructive">{formErrors.name}</p>}
                    </div>

                    {/* Email Field */}
                    <div>
                      <label className="block text-sm font-medium text-foreground">Email</label>
                      <div className="relative mt-2">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="email"
                          value={editedProfile.email}
                          onChange={(e) => handleProfileChange('email', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full rounded-lg border px-4 py-3 pl-10 text-sm transition-colors ${
                            isEditing
                              ? 'border-border bg-background focus:border-accent focus:outline-none'
                              : 'border-border/50 bg-secondary/30 text-muted-foreground'
                          } ${formErrors.email ? 'border-destructive' : ''}`}
                          placeholder="Enter your email"
                        />
                      </div>
                      {formErrors.email && (
                        <p className="mt-1 text-xs text-destructive">{formErrors.email}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {isEditing && (
                      <div className="flex gap-3 border-t border-border pt-6">
                        <button
                          onClick={handleSaveProfile}
                          className="flex-1 rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-accent"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false)
                            setEditedProfile(user)
                            setAvatarPreview(null)
                            setFormErrors({})
                          }}
                          className="flex-1 rounded-lg border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mb-6 text-xl font-['Playfair_Display'] font-bold text-foreground">Change Password</h2>

                  <div className="space-y-5">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        Current Password
                      </label>
                      <div className="relative mt-2">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.current}
                          onChange={(e) => handlePasswordChange('current', e.target.value)}
                          className={`w-full rounded-lg border border-border bg-background px-4 py-3 pl-10 pr-10 text-sm transition-colors focus:border-accent focus:outline-none ${
                            formErrors.current ? 'border-destructive' : ''
                          }`}
                          placeholder="Enter your current password"
                        />
                        <button
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {formErrors.current && <p className="mt-1 text-xs text-destructive">{formErrors.current}</p>}
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        New Password
                      </label>
                      <div className="relative mt-2">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.new}
                          onChange={(e) => handlePasswordChange('new', e.target.value)}
                          className={`w-full rounded-lg border border-border bg-background px-4 py-3 pl-10 pr-10 text-sm transition-colors focus:border-accent focus:outline-none ${
                            formErrors.new ? 'border-destructive' : ''
                          }`}
                          placeholder="Enter your new password"
                        />
                        <button
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {formErrors.new && <p className="mt-1 text-xs text-destructive">{formErrors.new}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">Minimum 8 characters</p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        Confirm Password
                      </label>
                      <div className="relative mt-2">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirm}
                          onChange={(e) => handlePasswordChange('confirm', e.target.value)}
                          className={`w-full rounded-lg border border-border bg-background px-4 py-3 pl-10 pr-10 text-sm transition-colors focus:border-accent focus:outline-none ${
                            formErrors.confirm ? 'border-destructive' : ''
                          }`}
                          placeholder="Confirm your new password"
                        />
                        <button
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {formErrors.confirm && <p className="mt-1 text-xs text-destructive">{formErrors.confirm}</p>}
                    </div>

                    {/* Update Button */}
                    <div className="flex gap-3 border-t border-border pt-6">
                      <button
                        onClick={handleUpdatePassword}
                        className="flex-1 rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-accent"
                      >
                        Update Password
                      </button>
                      <button
                        onClick={() => {
                          setPasswordData({ current: '', new: '', confirm: '' })
                          setFormErrors({})
                        }}
                        className="flex-1 rounded-lg border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Danger Zone */}
            <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/10 p-6">
              <h3 className="mb-2 font-semibold text-destructive">Danger Zone</h3>
              <p className="mb-4 text-sm text-destructive/80">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="rounded-lg border border-destructive/30 bg-background px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Account Modal (unchanged) */}
      {showDeleteModal && (
        // ... same modal but with theme classes
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-card border border-border p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Delete Account</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete your account? This action is permanent and cannot be
              reversed. All your data will be permanently deleted.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  alert('Account deleted successfully')
                }}
                className="flex-1 rounded-lg bg-destructive py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/80"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}