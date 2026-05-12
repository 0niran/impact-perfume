import { cn } from '@/lib/cn'
import { HTMLAttributes } from 'react'

type SectionTag = 'section' | 'div' | 'article' | 'aside'

interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: SectionTag
  bg?: string
}

export default function Section({
  as: Tag = 'section',
  bg,
  className,
  children,
  ...props
}: SectionProps) {
  const Component = Tag as 'section'
  return (
    <Component className={cn('section-y', bg, className)} {...props}>
      {children}
    </Component>
  )
}
