import { cn } from '@/lib/cn'
import { HTMLAttributes } from 'react'

type ContainerTag = 'div' | 'article' | 'aside' | 'main' | 'nav' | 'section' | 'header' | 'footer'

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ContainerTag
}

export default function Container({
  as: Tag = 'div',
  className,
  children,
  ...props
}: ContainerProps) {
  const Component = Tag as 'div'
  return (
    <Component
      className={cn('mx-auto w-full max-w-container container-px', className)}
      {...props}
    >
      {children}
    </Component>
  )
}
