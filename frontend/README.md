# Academic NFT Marketplace - Frontend

A Next.js frontend for the Cross-University Academic Achievement Marketplace that transforms academic achievements into NFTs and unlocks exclusive opportunities.

## Features

- 🎓 **University Authentication**: Secure login with university email verification
- 🏆 **Achievement Management**: Upload and track academic achievements
- 🔗 **Multi-chain Wallet Integration**: Connect Ethereum, Polygon, and other wallets
- 🎨 **NFT Minting**: Transform verified achievements into soul-bound NFTs
- 🔐 **Gated Access**: Unlock exclusive opportunities with achievement NFTs
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + React Query
- **Blockchain**: Ethers.js, Web3 wallet integration
- **UI Components**: Headless UI, Heroicons
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Running backend API (see `/backend` directory)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env.local
```

3. Configure environment variables:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_id
```

4. Start development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
frontend/
├── pages/                 # Next.js pages
│   ├── index.tsx         # Landing page
│   ├── login.tsx         # Authentication
│   ├── register.tsx      # User registration
│   ├── dashboard.tsx     # User dashboard
│   ├── achievements/     # Achievement management
│   ├── nfts/            # NFT viewing and minting
│   └── opportunities/    # Exclusive opportunities
├── src/
│   ├── components/       # Reusable React components
│   │   ├── Layout/      # Layout components
│   │   └── Wallet/      # Wallet connection
│   ├── contexts/        # React contexts
│   │   ├── AuthContext.tsx
│   │   └── WalletContext.tsx
│   ├── lib/            # Utilities and API clients
│   └── styles/         # Global styles
└── public/             # Static assets
```

## Key Features

### Authentication System
- University email verification
- JWT-based session management
- Multi-university support (EMU, Eastern, Thomas Edison, Oakland, Virginia Tech)

### Achievement Management
- Upload academic achievements with proof documents
- Support for GPA, research, and leadership achievements
- Admin verification workflow

### NFT Integration
- Soul-bound NFTs (non-transferable)
- Three NFT types: GPA Guardian, Research Rockstar, Leadership Legend
- Blockchain minting with metadata

### Opportunity Access
- Gated access to premium resources
- Digital and physical opportunities
- Automatic eligibility checking based on NFT ownership

### Wallet Integration
- MetaMask and other Web3 wallet support
- Multi-chain compatibility (Ethereum, Polygon, Sepolia testnet)
- Automatic network switching

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - WalletConnect project ID (optional)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.