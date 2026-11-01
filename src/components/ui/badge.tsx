import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Small square-cornered tags. Blue marks our pick, green marks savings,
// grey is neutral information.
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border border-transparent px-2 text-xs font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary",
        secondary: "bg-subtle text-ink",
        outline: "border-line-strong text-ink",
        muted: "bg-subtle text-ink-muted",
        destructive: "bg-danger-soft text-danger",
        ghost: "text-ink-muted",
        link: "text-link underline underline-offset-4",
        savings: "bg-savings-soft text-savings",
        recommended: "bg-primary-soft text-primary-ink",
        demo: "border-on-brand-muted font-medium text-on-brand-muted",
        count: "h-5 min-w-5 bg-primary px-1.5 text-on-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
