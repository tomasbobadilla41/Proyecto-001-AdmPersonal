import { useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { Button } from '../ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { CEDEAR_LISTINGS } from '../../utils/cedears'

interface CedearComboboxProps {
  value: string
  onChange: (ticker: string) => void
}

/** Buscador de CEDEARs (Popover + Command) sobre el listado estático de los 30 más operados. */
export function CedearCombobox({ value, onChange }: CedearComboboxProps) {
  const [open, setOpen] = useState(false)
  const selected = CEDEAR_LISTINGS.find((c) => c.ticker === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? `${selected.ticker} — ${selected.name}` : 'Buscar CEDEAR…'}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command>
          <CommandInput placeholder="Buscar ticker o empresa…" />
          <CommandList>
            <CommandEmpty>No se encontró ningún CEDEAR.</CommandEmpty>
            <CommandGroup>
              {CEDEAR_LISTINGS.map((c) => (
                <CommandItem
                  key={c.ticker}
                  value={`${c.ticker} ${c.name}`}
                  data-checked={value === c.ticker}
                  onSelect={() => {
                    onChange(c.ticker)
                    setOpen(false)
                  }}
                >
                  {c.ticker} — {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
