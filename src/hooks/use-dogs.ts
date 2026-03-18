import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDog,
  getDogById,
  listDogs,
  updateDog,
  uploadDogPhoto,
  type DogFilters,
  type UpsertDogInput,
} from '../services/dogs.service'
import { listMyOutOfAreaDogs } from '../lib/communityData'

export function useDogs(filters: DogFilters = {}) {
  return useQuery({
    queryKey: ['dogs', filters],
    queryFn: () => listDogs(filters),
  })
}

export function useDog(dogId: string) {
  return useQuery({
    queryKey: ['dogs', dogId],
    queryFn: () => getDogById(dogId),
    enabled: Boolean(dogId),
  })
}

export function useCreateDog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpsertDogInput) => createDog(input),
    onSuccess: async (dog) => {
      await queryClient.invalidateQueries({ queryKey: ['dogs'] })
      queryClient.setQueryData(['dogs', dog.id], dog)
    },
  })
}

export function useUpdateDog(dogId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Partial<UpsertDogInput>) => updateDog(dogId, input),
    onSuccess: async (dog) => {
      await queryClient.invalidateQueries({ queryKey: ['dogs'] })
      queryClient.setQueryData(['dogs', dog.id], dog)
    },
  })
}

export function useUploadDogPhoto() {
  return useMutation({
    mutationFn: ({ file, userId }: { file: File; userId: string }) => uploadDogPhoto(file, userId),
  })
}

/** Dogs the current user tagged in a pincode outside their home society. */
export function useMyOutOfAreaDogs() {
  return useQuery({
    queryKey: ['dogs', 'out-of-area'],
    queryFn: listMyOutOfAreaDogs,
  })
}
