import * as React from 'react';
import { Check, ChevronsUpDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

interface TimezoneSelectProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

// Common timezones to show at the top or filter by
const COMMON_TIMEZONES = [
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "America/Chicago",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Australia/Sydney",
];

export const TimezoneSelect: React.FC<TimezoneSelectProps> = ({
    value,
    onChange,
    className,
}) => {
    const [open, setOpen] = React.useState(false);

    // Get all supported timezones
    const timezones = React.useMemo(() => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (Intl as any).supportedValuesOf('timeZone');
        } catch (e) {
            console.error("Timezone API not supported", e);
            return COMMON_TIMEZONES;
        }
    }, []);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] hover:bg-[hsl(var(--loom-surface-hover))]",
                        className
                    )}
                >
                    <div className="flex items-center gap-2 truncate">
                        <Globe className="w-4 h-4 text-[hsl(var(--loom-text-muted))]" />
                        <span className="truncate">{value.replace(/_/g, ' ')}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-[hsl(var(--loom-surface))] border border-[hsl(var(--loom-border))] rounded-[var(--loom-radius-md)] shadow-lg" align="start">
                <Command>
                    <CommandInput placeholder="Search timezone..." />
                    <CommandList>
                        <CommandEmpty>No timezone found.</CommandEmpty>
                        <CommandGroup>
                            {timezones.map((tz) => (
                                <CommandItem
                                    key={tz}
                                    value={tz}
                                    onSelect={(currentValue) => {
                                        onChange(currentValue);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === tz ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {tz.replace(/_/g, ' ')}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
