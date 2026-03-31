import { Link } from 'react-router';
import { Home, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { motion } from 'motion/react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mb-8">
          <ShoppingBag className="w-24 h-24 mx-auto text-blue-600 mb-4" />
          <h1 className="text-9xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent mb-4">
            404
          </h1>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
          <p className="text-xl text-gray-600 mb-8">
            Oops! The page you're looking for doesn't exist.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button size="lg" className="gradient-primary text-white">
              <Home className="w-5 h-5 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Link to="/roles">
            <Button size="lg" variant="outline">
              Choose Your Role
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
