// External ratings display component
import { Star } from 'lucide-react';

const ExternalRatings = ({ googleRating, googleCount, tripadvisorRating, tripadvisorCount }) => {
  if (!googleRating && !tripadvisorRating) return null;

  return (
    <div className="flex items-center space-x-4 mt-2">
      {googleRating && (
        <div className="flex items-center bg-white px-3 py-1 rounded-full shadow-sm border">
          <img 
            src="https://www.google.com/favicon.ico" 
            alt="Google" 
            className="w-4 h-4 mr-2"
          />
          <div className="flex items-center">
            <span className="font-bold text-gray-900 mr-1">{googleRating}</span>
            <Star className="h-3 w-3 text-yellow-400 fill-current" />
          </div>
          <span className="text-xs text-gray-500 ml-1">({googleCount} reviews)</span>
        </div>
      )}
      {tripadvisorRating && (
        <div className="flex items-center bg-white px-3 py-1 rounded-full shadow-sm border">
          <img 
            src="https://www.tripadvisor.com/favicon.ico" 
            alt="TripAdvisor" 
            className="w-4 h-4 mr-2"
            onError={(e) => e.target.style.display = 'none'}
          />
          <div className="flex items-center">
            <span className="font-bold text-gray-900 mr-1">{tripadvisorRating}</span>
            <Star className="h-3 w-3 text-green-500 fill-current" />
          </div>
          <span className="text-xs text-gray-500 ml-1">({tripadvisorCount} reviews)</span>
        </div>
      )}
    </div>
  );
};

export default ExternalRatings;
