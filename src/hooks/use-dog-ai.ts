import { useMutation } from '@tanstack/react-query'
import { analyzeDogPhoto } from '../services/dog-ai.service'

export function useDogAiAnalysis() {
  return useMutation({
    mutationFn: (file: File) => analyzeDogPhoto(file),
  })
}
