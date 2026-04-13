# Phase 3 Implementation Guide - Advanced Financial Management

## 🎯 Overview

Phase 3 adds advanced financial management features including:
- ✅ **Expense Tracking** with categories and recurring options
- ✅ **Financial Goals** with progress tracking and projections
- ✅ **Receipt Issuance** with PDF generation
- ✅ **Payment Gateway Integrations** (Mercado Pago, Stripe, PagSeguro)

## ✅ Completed Tasks

### 1. Bug Fix - Revenue Reports
**File:** `components/revenue-reports.tsx`
- **Fixed:** Top 10 Clientes section now shows client names instead of `#{cliente_id}`
- **Implementation:** Added `getClientes()` call and joined data with consultas
- **Fallback:** Displays "Cliente #123" for clients without names

### 2. Database Migration
**File:** `supabase-migration-phase3.sql`
- **Tables Created:**
  - `categorias_despesas` - Expense categories
  - `despesas` - Expense tracking
  - `metas` - Financial goals
  - `recibos` - Receipt issuance
  - `integracoes_pagamento` - Payment integrations
- **Features:**
  - Default categories pre-populated
  - Triggers for `updated_at` timestamps
  - RLS policies enabled
  - Helpful view: `vw_despesas_por_categoria`

### 3. Supabase Library Update
**File:** `lib/supabase.ts`
- **New Interfaces:** CategoriaDespesa, Despesa, Meta, Recibo, IntegracaoPagamento
- **CRUD Functions:** All Phase 3 tables have full CRUD operations
- **Helper Functions:**
  - `getDespesasByPeriod(startDate, endDate)`
  - `getDespesasByCategoria(categoria_id, startDate, endDate)`
  - `getMetasAtivas()`
  - `calculateMetaProgress(meta_id)` - Auto-calculates goal progress
  - `generateNumeroRecibo()` - Auto-increment receipt numbers
  - `getRecibosPorCliente(cliente_id)`

## 📋 Migration Instructions

### Step 1: Run Database Migration
```bash
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of supabase-migration-phase3.sql
3. Execute the migration
4. Verify all tables created successfully
```

### Step 2: Verify Tables
Check that these tables exist:
- ✅ categorias_despesas (with 6 default categories)
- ✅ despesas
- ✅ metas
- ✅ recibos
- ✅ integracoes_pagamento

### Step 3: Test RLS Policies
```sql
-- Test as authenticated user
SELECT * FROM categorias_despesas;
SELECT * FROM despesas LIMIT 5;
```

## 🚀 Remaining Implementation

### Component 1: Expense Management
**File:** `components/expense-management.tsx`

**Required Features:**
- Add expense form with validation
- Category selector (dropdown with colors)
- Date picker, amount input, payment method
- File upload for receipts (Supabase Storage)
- Recurring expense checkbox with frequency
- Expense list table with filters (date range, category, payment)
- Summary cards: Total Expenses, By Category, Recurring vs One-time
- Pie chart: expenses by category (Recharts)
- Line chart: monthly expense trend
- Category management modal (CRUD categories)
- Export expenses to CSV

**Key Functions to Use:**
```typescript
import {
  getDespesas,
  getDespesasByPeriod,
  createDespesa,
  updateDespesa,
  deleteDespesa,
  getCategoriasDespesas,
  createCategoriaDespesa,
  updateCategoriaDespesa
} from '@/lib/supabase'
```

**UI Pattern:**
```tsx
<Tabs>
  <TabsList>
    <TabsTrigger>Despesas</TabsTrigger>
    <TabsTrigger>Categorias</TabsTrigger>
  </TabsList>
  <TabsContent value="despesas">
    {/* Expense form + list + charts */}
  </TabsContent>
  <TabsContent value="categorias">
    {/* Category management */}
  </TabsContent>
</Tabs>
```

### Component 2: Goals & Projections
**File:** `components/goals-projections.tsx`

**Required Features:**
- Create goal modal: type, target value, period, dates
- Goal cards showing progress bars (current vs target)
- Visual indicators: 🟢 On track, 🟡 At risk, 🔴 Behind
- Line chart: projected vs actual revenue/expense/profit
- Period selector: This Month, This Quarter, This Year, Custom
- Goal list with edit/delete actions
- Alerts section for goals at risk
- Projection calculator based on historical data
- Break-even analysis

**Key Functions to Use:**
```typescript
import {
  getMetas,
  getMetasAtivas,
  createMeta,
  updateMeta,
  deleteMeta,
  calculateMetaProgress
} from '@/lib/supabase'
```

**Progress Indicators:**
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'on_track': return 'bg-green-100 text-green-800'
    case 'at_risk': return 'bg-yellow-100 text-yellow-800'
    case 'behind': return 'bg-red-100 text-red-800'
  }
}
```

### Component 3: Receipt Issuance
**File:** `components/receipt-issuance.tsx`

**Required Features:**
- Generate receipt from consultation (auto-fill)
- Manual receipt creation form
- Receipt preview card with:
  - Clinic logo placeholder
  - Clinic name and address
  - Receipt number (auto-generated)
  - Client name and details
  - Service description and value
  - Issue date
  - Footer text (customizable)
- PDF download button (use jsPDF)
- Receipt list table (searchable, filterable)
- Email receipt option (placeholder for future)
- Print receipt button
- Receipt template settings modal
- Bulk receipt generation for multiple consultations

**Key Functions to Use:**
```typescript
import {
  getRecibos,
  getRecibosPorCliente,
  generateNumeroRecibo,
  createRecibo,
  updateRecibo,
  deleteRecibo
} from '@/lib/supabase'
```

**jsPDF Setup:**
```bash
npm install jspdf
```

```typescript
import jsPDF from 'jspdf'

const generatePDF = (recibo: Recibo) => {
  const doc = new jsPDF()
  doc.setFontSize(20)
  doc.text('RECIBO', 105, 20, { align: 'center' })
  doc.setFontSize(12)
  doc.text(`Nº ${recibo.numero_recibo}`, 105, 30, { align: 'center' })
  // Add more content...
  doc.save(`recibo-${recibo.numero_recibo}.pdf`)
}
```

### Component 4: Payment Integrations
**File:** `components/payment-integrations.tsx`

**Required Features:**
- Integration cards for each provider (Mercado Pago, Stripe, PagSeguro)
- Each card shows:
  - Provider logo/name
  - Status indicator (active/inactive/testing)
  - Configure button
- Configuration modal:
  - API credentials inputs (masked for security)
  - Webhook URL display (auto-generated)
  - Environment selector (sandbox/production)
  - Test connection button
  - Save credentials (encrypt before storing)
- Payment link generator:
  - Amount input
  - Description input
  - Generate link button
  - Copy to clipboard
- Transaction log table (future - placeholder)
- Integration docs links

**Key Functions to Use:**
```typescript
import {
  getIntegracoesPagamento,
  getIntegracaoAtiva,
  createIntegracaoPagamento,
  updateIntegracaoPagamento,
  deleteIntegracaoPagamento
} from '@/lib/supabase'
```

**Security - Encryption:**
```bash
npm install crypto-js
```

```typescript
import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY!

const encryptApiKey = (apiKey: string): string => {
  return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString()
}

const decryptApiKey = (encrypted: string): string => {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}
```

### Component 5: Dashboard Integration
**File:** `components/financial-dashboard.tsx`

**Updates Required:**
```tsx
// Add new tabs
<TabsList>
  {/* Existing tabs */}
  <TabsTrigger value="despesas">
    <TrendingDown className="h-4 w-4 mr-2" />
    Despesas
  </TabsTrigger>
  <TabsTrigger value="metas">
    <Target className="h-4 w-4 mr-2" />
    Metas
  </TabsTrigger>
  <TabsTrigger value="recibos">
    <Receipt className="h-4 w-4 mr-2" />
    Recibos
  </TabsTrigger>
  <TabsTrigger value="integracoes">
    <CreditCard className="h-4 w-4 mr-2" />
    Integrações
  </TabsTrigger>
</TabsList>

// Add new content
<TabsContent value="despesas">
  <ExpenseManagement />
</TabsContent>
<TabsContent value="metas">
  <GoalsProjections />
</TabsContent>
<TabsContent value="recibos">
  <ReceiptIssuance />
</TabsContent>
<TabsContent value="integracoes">
  <PaymentIntegrations />
</TabsContent>
```

## 🔐 Security Considerations

### 1. API Key Encryption
- **NEVER** store API keys in plain text
- Use crypto-js for encryption before saving to database
- Store encryption key in environment variables
- Never expose decrypted keys in logs

### 2. File Uploads (Supabase Storage)
```typescript
// Upload receipt attachment
const uploadReceipt = async (file: File, despesaId: number) => {
  const supabase = createClient()
  const fileName = `${despesaId}-${Date.now()}-${file.name}`
  
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(fileName, file)
  
  if (error) {
    console.error('Upload error:', error)
    return null
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from('receipts')
    .getPublicUrl(fileName)
  
  return publicUrl
}
```

### 3. RLS Policies
- All tables have RLS enabled
- Current policies: authenticated users have full access
- **Recommended:** Restrict to user's own data in production

## 📊 Color Scheme

Use consistent colors across all components:
- **Green** (#10b981): Revenue, success, positive metrics
- **Red** (#ef4444): Expenses, overdue, negative metrics
- **Blue** (#3b82f6): Information, neutral data
- **Yellow** (#eab308): Warnings, at-risk items
- **Purple** (#8b5cf6): Special metrics, highlights

## 🧪 Testing Checklist

### Database
- [ ] All tables created successfully
- [ ] RLS policies enabled
- [ ] Triggers working for updated_at
- [ ] Default categories inserted

### Expense Management
- [ ] Create expense
- [ ] Edit expense
- [ ] Delete expense
- [ ] Filter by category
- [ ] Filter by date range
- [ ] Upload receipt attachment
- [ ] Create recurring expense
- [ ] Export to CSV
- [ ] Category CRUD operations

### Goals & Projections
- [ ] Create goal (receita, despesa, lucro)
- [ ] Progress calculation accurate
- [ ] Status indicators (on track, at risk, behind)
- [ ] Edit goal
- [ ] Delete goal
- [ ] Projection charts display correctly

### Receipt Issuance
- [ ] Auto-generate receipt number
- [ ] Create receipt from consultation
- [ ] Create manual receipt
- [ ] Generate PDF
- [ ] Print receipt
- [ ] Search receipts
- [ ] Filter by client
- [ ] Bulk generation

### Payment Integrations
- [ ] Add integration configuration
- [ ] Encrypt API keys
- [ ] Test connection
- [ ] Generate payment link
- [ ] Copy to clipboard
- [ ] Update configuration
- [ ] Delete integration

## 🐛 Troubleshooting

### Issue: Tables don't exist
**Solution:** Run `supabase-migration-phase3.sql` in Supabase SQL Editor

### Issue: RLS blocking queries
**Solution:** Check authentication and RLS policies
```sql
-- Temporarily disable for testing (development only!)
ALTER TABLE despesas DISABLE ROW LEVEL SECURITY;
```

### Issue: Encryption/decryption fails
**Solution:** Ensure `NEXT_PUBLIC_ENCRYPTION_KEY` is set in `.env.local`
```bash
NEXT_PUBLIC_ENCRYPTION_KEY=your-32-char-secret-key-here
```

### Issue: File upload fails
**Solution:** Create Storage bucket in Supabase Dashboard
1. Go to Storage → Create bucket "receipts"
2. Set to public or configure RLS policies

### Issue: Chart not displaying
**Solution:** Check data format and Recharts imports
```tsx
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts'
```

## 📚 Additional Resources

### Libraries Used
- **shadcn/ui**: UI components
- **Recharts**: Data visualization
- **date-fns**: Date formatting
- **jsPDF**: PDF generation
- **crypto-js**: Encryption
- **Supabase**: Backend

### Documentation Links
- Supabase Storage: https://supabase.com/docs/guides/storage
- Recharts: https://recharts.org/
- jsPDF: https://github.com/parallax/jsPDF
- crypto-js: https://github.com/brix/crypto-js

## 🎉 Next Steps

1. Run database migration
2. Create the 4 missing components (expense-management, goals-projections, receipt-issuance, payment-integrations)
3. Update financial-dashboard.tsx with new tabs
4. Test all features thoroughly
5. Deploy to production

## 📝 Notes

- All text must be in Portuguese (Português BR)
- Follow existing component patterns for consistency
- Use TypeScript with full typing
- Implement error handling with toast notifications
- Add loading states (skeleton UI)
- Ensure responsive design (mobile-first)
- Add accessibility (ARIA labels)

---

**Status:** Phase 3 infrastructure complete! Ready for component implementation.
