<script lang="ts">
  import { Select as SelectPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";
  import type { ComponentProps } from "svelte";

  let {
    class: className,
    ...restProps
  }: ComponentProps<typeof SelectPrimitive.Icon> = $props();
</script>

<SelectPrimitive.Icon class={cn("ml-auto text-muted-foreground", className)} {...restProps} />
