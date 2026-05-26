# Eden Wallet - Project Summary

**Eden Wallet** is a sophisticated personal finance application designed for dual-ledger tracking (Personal and Joint expenses). It features an offline-first architecture with cloud synchronization and AI-powered transaction entry.

## 1. Project Overview
The application allows users to manage two distinct workspaces: **Personal (QWK)** and **Joint (NXQWK)**. It is built to handle complex interpersonal debts and shared fund contributions within a clean, modern interface.

## 2. Core Tech Stack
*   **Frontend**: React 18+ (TypeScript), Vite
*   **Styling**: Tailwind CSS
*   **Charts**: Recharts
*   **Icons**: Lucide React
*   **Backend/Sync**: 
    *   **Supabase**: Primary cloud database for transactions and settings.
    *   **Firebase**: Secondary integration for authentication/storage.
*   **AI**: Google Gemini API (`@google/genai`) for natural language transaction parsing ("Smart Add").

## 3. Key Features
*   **Dual Ledger System**: Independent settings and data for Personal and Joint accounts.
*   **Interpersonal Debt Tracking**: Specialized account types to track money owed to/by partners or shared funds.
*   **Hierarchical Categories**: Two-level category system (e.g., Food > Restaurant).
*   **Smart Add (AI)**: Natural language input to log expenses (e.g., "Lunch at McDonald's $12").
*   **Analytics**: Visual spending breakdowns and monthly trends.
*   **Offline-First**: Data is saved to `localStorage` and synced to Supabase when available.

## 4. Data Model (`types.ts`)
*   **`Transaction`**:
    *   `id`: string
    *   `date`: string (ISO)
    *   `amount`: number
    *   `spending_category`: string
    *   `sub_category`: string
    *   `account_type`: string (maps to `SystemAccountType`)
    *   `remarks`: string
*   **`Ledger`**: Enum (`QWK` | `NXQWK`)
*   **`SystemAccountType`**: Enum defining the logic for who pays and who owes (e.g., `OWN_EXPENSE`, `OWED_TO_NXQ`).

## 5. File Structure
*   `/src/App.tsx`: Main entry point and state management.
*   `/src/storage.ts`: Abstraction layer for `localStorage` and Supabase sync.
*   `/src/supabase.ts`: Supabase client initialization and config check.
*   `/src/constants.tsx`: Default categories, account labels, and color palettes.
*   `/src/components/`:
    *   `SmartAdd.tsx`: AI parsing interface.
    *   `AnalyticsDashboard.tsx`: Recharts visualizations.
    *   `TransactionForm.tsx`: Manual entry form.
    *   `TransactionList.tsx`: History view with filtering.

## 6. Configuration & Setup
To run this project, the following environment variables are required:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key
```

### Database Requirements (Supabase)
The app expects the following tables:
1.  **`transactions`**:
    *   `id` (UUID, primary key)
    *   `user_id` (UUID)
    *   `ledger` (text: 'QWK' or 'NXQWK')
    *   `date` (timestamp)
    *   `amount` (numeric)
    *   `spending_category` (text)
    *   `sub_category` (text)
    *   `account_type` (text)
    *   `remarks` (text)
2.  **`workspace_settings`**:
    *   `user_id` (UUID)
    *   `ledger` (text)
    *   `settings` (JSONB)
    *   *Conflict constraint on (user_id, ledger)*

## 7. Development Notes
*   **Port**: The dev server runs on port `3000`.
*   **Build**: `npm run build` generates static files in `/dist`.
*   **Sync Logic**: The app checks `isSupabaseConfigured` to decide whether to attempt cloud operations. If keys are missing, it operates purely in `localStorage` mode.
