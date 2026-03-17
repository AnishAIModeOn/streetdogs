import { useEffect, useMemo, useState } from 'react'
import { listProfilesForAdmin, updateUserRole } from '../lib/communityData'

const roleOptions = ['end_user', 'inventory_admin', 'superadmin']

function formatRole(role) {
  return role ? role.replaceAll('_', ' ') : 'Not set'
}

export function AdminUsersPage({ profile }) {
  const [users, setUsers] = useState([])
  const [draftRoles, setDraftRoles] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingUserId, setIsSavingUserId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isSuperadmin = profile?.role === 'superadmin'

  useEffect(() => {
    if (!isSuperadmin) {
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadUsers = async () => {
      try {
        setErrorMessage('')
        const nextUsers = await listProfilesForAdmin()

        if (!isMounted) {
          return
        }

        setUsers(nextUsers)
        setDraftRoles(
          Object.fromEntries(nextUsers.map((user) => [user.id, user.role || 'end_user'])),
        )
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load users.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadUsers()

    return () => {
      isMounted = false
    }
  }, [isSuperadmin])

  const usersWithDrafts = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        draftRole: draftRoles[user.id] || user.role || 'end_user',
      })),
    [draftRoles, users],
  )

  const handleSaveRole = async (userId) => {
    try {
      setIsSavingUserId(userId)
      setErrorMessage('')
      setSuccessMessage('')
      await updateUserRole(userId, draftRoles[userId])

      const refreshedUsers = await listProfilesForAdmin()
      setUsers(refreshedUsers)
      setDraftRoles(
        Object.fromEntries(refreshedUsers.map((user) => [user.id, user.role || 'end_user'])),
      )
      setSuccessMessage('Role updated successfully.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update that user role.')
    } finally {
      setIsSavingUserId(null)
    }
  }

  if (!isSuperadmin) {
    return (
      <section className="section stack">
        <div className="panel empty-state">
          <h3>Unauthorized</h3>
          <p>Only superadmin users can manage roles on this page.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="section stack">
      <div className="section-heading">
        <p className="eyebrow">Admin</p>
        <h2>Manage user roles</h2>
        <p className="helper-copy">Review area assignments and update roles one user at a time.</p>
      </div>

      {errorMessage ? <p className="status-banner status-error">{errorMessage}</p> : null}
      {successMessage ? <p className="status-banner">{successMessage}</p> : null}

      {isLoading ? (
        <div className="panel empty-state">
          <h3>Loading users</h3>
          <p>Checking profile records and primary areas.</p>
        </div>
      ) : (
        <div className="stack">
          {usersWithDrafts.map((user) => (
            <article key={user.id} className="panel admin-user-card">
              <div className="card-top">
                <div>
                  <h3>{user.full_name || 'Name not added'}</h3>
                  <p>{user.primary_area ? `${user.primary_area.city} - ${user.primary_area.name}` : 'Primary area not set'}</p>
                </div>
                <span className="tag">{formatRole(user.role)}</span>
              </div>

              <div className="detail-grid compact-grid">
                <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
                <p><strong>User ID:</strong> {user.id}</p>
              </div>

              <div className="admin-role-row">
                <select
                  value={user.draftRole}
                  onChange={(event) =>
                    setDraftRoles((current) => ({
                      ...current,
                      [user.id]: event.target.value,
                    }))
                  }
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {formatRole(role)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="button button-primary"
                  disabled={isSavingUserId === user.id || user.draftRole === user.role}
                  onClick={() => handleSaveRole(user.id)}
                >
                  {isSavingUserId === user.id ? 'Saving...' : 'Update role'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
