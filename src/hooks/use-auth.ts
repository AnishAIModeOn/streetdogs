import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAuthState,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updateMyProfile,
} from '../services/auth.service'

export function useAuthState() {
  return useQuery({
    queryKey: ['auth', 'state'],
    queryFn: getAuthState,
  })
}

export function useSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signInWithPassword(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  })
}

export function useSignUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: signUpWithPassword,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: signOut,
    onSuccess: async () => {
      queryClient.clear()
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  })
}
