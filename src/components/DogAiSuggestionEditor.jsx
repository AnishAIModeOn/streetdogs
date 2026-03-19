import { Sparkles } from 'lucide-react'
import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { FormField, FormLabel } from './ui/form'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'

const fieldConfig = [
  {
    key: 'ai_summary',
    label: 'Short summary',
    multiline: true,
    placeholder: 'A calm one-line summary of what AI noticed in the photo',
  },
  {
    key: 'ai_condition',
    label: 'Likely condition / status',
    placeholder: 'Stable, thin, cautious, playful, needs review…',
  },
  {
    key: 'ai_urgency',
    label: 'Urgency',
    placeholder: 'low, medium, high, or critical',
  },
  {
    key: 'ai_injuries',
    label: 'Visible injuries or issues',
    multiline: true,
    placeholder: 'Any visible limping, wounds, irritation, or uncertainty',
  },
  {
    key: 'ai_breed_guess',
    label: 'Breed / type guess',
    placeholder: 'Indie, mixed breed, shepherd mix…',
  },
  {
    key: 'ai_color',
    label: 'Color',
    placeholder: 'Brown, black and white, tan…',
  },
  {
    key: 'ai_age_band',
    label: 'Age band',
    placeholder: 'puppy, young, adult, senior, unknown',
  },
]

export function DogAiSuggestionEditor({
  suggestions,
  onChange,
  statusMessage = '',
  title = 'Review AI suggestions',
}) {
  if (!suggestions) {
    return null
  }

  return (
    <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="w-fit" variant="secondary">
            <Sparkles className="h-3.5 w-3.5" />
            Review AI suggestions
          </Badge>
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          AI suggestions are a starting point. Please edit anything that does not feel right before
          you submit.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {statusMessage ? (
          <div className="rounded-[1.5rem] bg-secondary/25 p-4 text-sm leading-6 text-muted-foreground">
            {statusMessage}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          {fieldConfig.map((field) => (
            <FormField key={field.key} className={field.multiline ? 'md:col-span-2' : ''}>
              <FormLabel>{field.label}</FormLabel>
              {field.multiline ? (
                <Textarea
                  className="min-h-[88px]"
                  placeholder={field.placeholder}
                  value={suggestions[field.key] || ''}
                  onChange={(event) => onChange(field.key, event.target.value)}
                />
              ) : (
                <Input
                  placeholder={field.placeholder}
                  value={suggestions[field.key] || ''}
                  onChange={(event) => onChange(field.key, event.target.value)}
                />
              )}
            </FormField>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
