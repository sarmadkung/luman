import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import './Text.css';

export type TextVariant = 'large-title' | 'title' | 'headline' | 'body' | 'caption' | 'metric';

export type TextTone =
  'default' | 'secondary' | 'muted' | 'accent' | 'success' | 'warning' | 'danger';

export interface TextProps extends Omit<HTMLAttributes<HTMLElement>, 'color'> {
  readonly variant?: TextVariant;
  readonly tone?: TextTone;
  readonly as?: ElementType;
  readonly children: ReactNode;
}

const DEFAULT_TAG: Record<TextVariant, ElementType> = {
  'large-title': 'h1',
  title: 'h2',
  headline: 'h3',
  body: 'p',
  caption: 'span',
  metric: 'span',
};

/** Typographic primitive. All sizes/weights come from tokens — never hardcoded. */
export function Text({
  variant = 'body',
  tone = 'default',
  as,
  className,
  children,
  ...rest
}: TextProps) {
  const Tag = as ?? DEFAULT_TAG[variant];
  return (
    <Tag
      className={['lm-text', `lm-text--${variant}`, `lm-text--${tone}`, className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
