export default defineAppConfig({
  ui: {
    colors: {
      primary: 'sky',
      secondary: 'blue',
      success: 'green',
      info: 'blue',
      warning: 'yellow',
      error: 'red',
      neutral: 'mist'
    },
    button: {
      defaultVariants: {
        variant: 'soft'
      }
    },
    badge: {
      defaultVariants: {
        variant: 'soft'
      }
    },
    input: {
      defaultVariants: {
        variant: 'soft'
      }
    },
    select: {
      defaultVariants: {
        variant: 'soft'
      }
    },
    textarea: {
      defaultVariants: {
        variant: 'soft'
      }
    },
    selectMenu: {
      defaultVariants: {
        variant: 'soft'
      }
    },
    inputMenu: {
      defaultVariants: {
        variant: 'soft'
      }
    },
    inputNumber: {
      defaultVariants: {
        variant: 'soft'
      }
    },
    inputTags: {
      defaultVariants: {
        variant: 'soft'
      }
    },
    inputDate: {
      defaultVariants: {
        variant: 'soft'
      }
    },
    inputTime: {
      defaultVariants: {
        variant: 'soft'
      }
    },
    pinInput: {
      defaultVariants: {
        variant: 'soft'
      }
    },
    formField: {
      slots: {
        help: 'mt-1.5 text-xs text-muted leading-snug',
        description: 'text-xs text-muted leading-snug',
        hint: 'text-xs text-muted',
        error: 'mt-1.5 text-xs text-error leading-snug'
      }
    }
  }
})