import {
    Info,
    Clock,
    DollarSign,
    Settings as SettingsIcon,
    BarChart3,
    Package,
    Tag,
    BoxIcon,
    Plus,
} from 'lucide-react';

export const PRODUCT_FORM_TABS = [
    { id: 'identity', label: '1. Identity', icon: Info },
    { id: 'status', label: '2. Status', icon: Clock },
    { id: 'pricing', label: '3. Pricing / Tax', icon: DollarSign },
    { id: 'accounting', label: '4. Accounting', icon: SettingsIcon },
    { id: 'inventory', label: '5. Inventory', icon: BarChart3 },
    { id: 'packaging', label: '6. Packaging', icon: Package },
    { id: 'identifiers', label: '7. Identifiers', icon: Tag },
    { id: 'attributes', label: '8. Attributes', icon: BoxIcon },
    { id: 'bulk', label: '9. Bulk Slabs', icon: Plus },
] as const;

export type ProductFormTabId = (typeof PRODUCT_FORM_TABS)[number]['id'];
