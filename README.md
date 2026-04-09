# Ethiopian AI Recommendation System

A full-stack AI-powered recommendation system with a focus on Ethiopian culture, cuisine, and content. Built with React/Next.js frontend, Flask backend, and MySQL database.

## Features

### Core Features
- **AI-Powered Recommendations**: Hybrid recommendation engine combining collaborative filtering and content-based approaches
- **User Authentication**: Secure JWT-based authentication with role-based access control
- **Credit System**: Pay-per-use model for AI recommendations
- **Admin Dashboard**: Comprehensive admin panel for system management
- **Ethiopian Focus**: Special section highlighting Ethiopian culture, cuisine, and content

### User Features
- Browse and search items by category
- Rate items (1-5 stars)
- Get personalized AI recommendations
- Manage wishlist/favorites
- View recommendation history
- Purchase and manage credits
- Profile management with taste preferences

### Admin Features
- User management (CRUD, role assignment, credit adjustments)
- Item management (CRUD, bulk operations)
- Credit transaction monitoring
- Analytics dashboard
- System settings configuration
- ML model performance monitoring

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (React)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **State Management**: React Context + SWR
- **Icons**: Lucide React

### Backend
- **Framework**: Flask (Python)
- **Authentication**: JWT (PyJWT)
- **Password Hashing**: bcrypt
- **CORS**: Flask-CORS
- **Database**: MySQL with mysql-connector-python

### Machine Learning
- **Libraries**: NumPy, scikit-learn
- **Algorithms**:
  - Collaborative Filtering (User-based & Item-based)
  - Content-Based Filtering (TF-IDF)
  - Hybrid Recommendations (Weighted combination)

### Database
- **RDBMS**: MySQL 8.0+
- **Features**: Foreign keys, indexes, stored procedures, triggers

## Project Structure

```
├── app/                          # Next.js frontend
│   ├── page.tsx                  # Home page
│   ├── login/                    # Login page
│   ├── register/                 # Registration page
│   ├── dashboard/                # User dashboard
│   ├── browse/                   # Item browsing
│   ├── item/[id]/                # Item detail page
│   ├── ethiopian/                # Ethiopian items section
│   ├── wishlist/                 # User wishlist
│   ├── profile/                  # User profile
│   ├── credits/                  # Credit purchase page
│   └── admin/                    # Admin panel
│       ├── page.tsx              # Admin dashboard
│       ├── users/                # User management
│       ├── items/                # Item management
│       ├── credits/              # Credit management
│       ├── analytics/            # Analytics dashboard
│       └── settings/             # System settings
├── backend/                      # Flask backend
│   ├── app/
│   │   ├── __init__.py           # Flask app initialization
│   │   ├── routes/
│   │   │   ├── auth.py           # Authentication endpoints
│   │   │   ├── users.py          # User management endpoints
│   │   │   ├── items.py          # Item endpoints
│   │   │   ├── admin.py          # Admin endpoints
│   │   │   ├── credits.py        # Credit system endpoints
│   │   │   └── recommendations.py # ML recommendation endpoints
│   │   ├── utils/
│   │   │   ├── database.py       # Database utilities
│   │   │   └── auth.py           # Auth utilities (JWT, decorators)
│   │   └── ml/
│   │       └── recommendation_engine.py  # ML algorithms
│   ├── database/
│   │   └── schema.sql            # MySQL database schema
│   ├── config.py                 # Configuration settings
│   ├── run.py                    # Flask entry point
│   └── requirements.txt          # Python dependencies
├── components/                   # React components
│   ├── navbar.tsx                # Navigation bar
│   ├── item-card.tsx             # Item card component
│   └── star-rating.tsx           # Star rating component
└── lib/                          # Utilities
    ├── api.ts                    # API client
    └── auth-context.tsx          # Auth context provider
```

## Installation

### Prerequisites
- Node.js 18+
- Python 3.9+
- MySQL 8.0+

### Database Setup

1. Create MySQL database:
```sql
CREATE DATABASE ethiopian_recommendations;
```

2. Run the schema:
```bash
mysql -u root -p ethiopian_recommendations < backend/database/schema.sql
```

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
# Create .env file
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=ethiopian_recommendations
JWT_SECRET_KEY=your-secret-key-here
FLASK_DEBUG=True
```

5. Run the Flask server:
```bash
python run.py
```

The backend will start at `http://localhost:5000`

### Frontend Setup

1. Install dependencies:
```bash
npm install
# or
pnpm install
```

2. Configure environment variables:
```bash
# Create .env.local file
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

3. Run the development server:
```bash
npm run dev
# or
pnpm dev
```

The frontend will start at `http://localhost:3000`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/refresh` | Refresh access token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get user profile |
| PUT | `/api/users/profile` | Update profile |
| GET | `/api/users/ratings` | Get user ratings |
| POST | `/api/users/ratings` | Add/update rating |
| GET | `/api/users/wishlist` | Get wishlist |
| POST | `/api/users/wishlist` | Add to wishlist |
| DELETE | `/api/users/wishlist/:id` | Remove from wishlist |

### Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items` | Get all items (paginated) |
| GET | `/api/items/:id` | Get item details |
| GET | `/api/items/categories` | Get all categories |
| GET | `/api/items/ethiopian` | Get Ethiopian items |
| GET | `/api/items/search` | Search items |

### Recommendations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recommendations` | Get personalized recommendations |
| GET | `/api/recommendations/similar/:id` | Get similar items |
| GET | `/api/recommendations/trending` | Get trending items |
| GET | `/api/recommendations/new` | Get new items |

### Credits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/credits/balance` | Get credit balance |
| GET | `/api/credits/history` | Get transaction history |
| POST | `/api/credits/purchase` | Purchase credits |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Get dashboard stats |
| GET | `/api/admin/users` | Get all users |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |
| POST | `/api/admin/users/:id/credits` | Adjust user credits |
| GET | `/api/admin/items` | Get all items (admin) |
| POST | `/api/admin/items` | Create item |
| PUT | `/api/admin/items/:id` | Update item |
| DELETE | `/api/admin/items/:id` | Delete item |

## Credit System

### Credit Costs
| Action | Cost |
|--------|------|
| Get AI Recommendations | 1 credit |
| Find Similar Items | 5 credits |
| Personalized Analysis | 10 credits |

### Credit Packages
| Package | Credits | Bonus | Price |
|---------|---------|-------|-------|
| Starter | 50 | 0 | $4.99 |
| Popular | 150 | 25 | $12.99 |
| Pro | 400 | 100 | $29.99 |
| Ultimate | 1000 | 350 | $59.99 |

New users receive 10 free credits upon registration.

## ML Recommendation Algorithms

### 1. Collaborative Filtering
- **User-Based**: Finds users with similar rating patterns and recommends items they liked
- **Item-Based**: Finds items similar to ones the user has rated highly
- Uses cosine similarity for measuring user/item similarity

### 2. Content-Based Filtering
- Uses TF-IDF vectorization on item descriptions, categories, and tags
- Recommends items with similar content to user's highly-rated items

### 3. Hybrid Approach
- Combines collaborative and content-based scores
- Default weights: 60% collaborative, 40% content-based
- Configurable through admin settings
- Handles cold-start problem by falling back to content-based for new users

## Database Schema

### Main Tables
- `users` - User accounts and profiles
- `items` - Recommendation catalog items
- `categories` - Item categories
- `tags` - Item tags for content filtering
- `ratings` - User item ratings
- `wishlist` - User wishlists
- `user_preferences` - User category preferences
- `credit_transactions` - Credit purchase/usage history
- `recommendation_history` - Tracking recommendations served

## Default Credentials

### Admin Account
- Email: admin@example.com
- Password: admin123

### Test User Account
- Email: user@example.com
- Password: user123

## Environment Variables

### Backend (.env)
```
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=ethiopian_recommendations
JWT_SECRET_KEY=your-super-secret-key
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=604800
FLASK_DEBUG=True
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Development

### Running Tests
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
npm run test
```

### Code Style
- Backend: PEP 8
- Frontend: ESLint + Prettier

## Deployment

### Backend (Production)
1. Use Gunicorn as WSGI server
2. Set `FLASK_DEBUG=False`
3. Use proper MySQL credentials
4. Set strong `JWT_SECRET_KEY`

### Frontend (Vercel)
1. Connect GitHub repository to Vercel
2. Set environment variables
3. Deploy

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Open a Pull Request

## Support

For issues and questions, please open a GitHub issue.
