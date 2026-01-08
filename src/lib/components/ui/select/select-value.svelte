<script lang="ts">
  import { Select as SelectPrimitive } from "bits-ui";
  import type { ComponentProps } from "svelte";

  let {
    class: className,
    ...restProps
  }: ComponentProps<typeof SelectPrimitive.Value> = $props();
</script>

<SelectPrimitive.Value data-slot="select-value" class={className} {...restProps} />
