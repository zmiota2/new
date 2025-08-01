import React, { useState, useEffect } from 'react';
import { Database, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../utils/supabase';

export const DatabaseConfig: React.FC = () => {
  const [config, setConfig] = useState({
    url: '',
    anonKey: ''
  });
  const [showKeys, setShowKeys] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkConnection();
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (url && key) {
      setConfig({ url, anonKey: key });
    }
  };

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase.from('invoices').select('count').limit(1);
      setIsConnected(!error);
    } catch (err) {
      setIsConnected(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.url || !config.anonKey) {
      setError('Wprowadź URL i klucz API');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Test connection with provided credentials
      const testClient = supabase;
      const { error } = await testClient.from('invoices').select('count').limit(1);
      
      if (error) {
        throw error;
      }

      setIsConnected(true);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Błąd połączenia z bazą danych');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = () => {
    // In a real app, you would save this to environment variables
    // For now, we'll just show instructions
    alert(`
Aby zapisać konfigurację, dodaj te zmienne do pliku .env:

VITE_SUPABASE_URL=${config.url}
VITE_SUPABASE_ANON_KEY=${config.anonKey}

Następnie zrestartuj aplikację.
    `);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Database className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Konfiguracja bazy danych</h2>
      </div>

      <div className="mb-6">
        <div className={`flex items-center space-x-2 p-3 rounded-lg ${
          isConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {isConnected ? (
            <>
              <Check className="w-5 h-5" />
              <span>Połączenie z bazą danych aktywne</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5" />
              <span>Brak połączenia z bazą danych</span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supabase URL
          </label>
          <input
            type="text"
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value })}
            placeholder="https://your-project.supabase.co"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supabase Anon Key
          </label>
          <div className="relative">
            <input
              type={showKeys ? 'text' : 'password'}
              value={config.anonKey}
              onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowKeys(!showKeys)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={handleTestConnection}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>Testuj połączenie</span>
          </button>
          
          <button
            onClick={handleSaveConfig}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Zapisz konfigurację
          </button>
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-800 mb-2">Instrukcje konfiguracji:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
          <li>Przejdź do <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Supabase</a> i utwórz nowy projekt</li>
          <li>W sekcji Settings → API znajdź URL projektu i klucz anon/public</li>
          <li>Wprowadź dane powyżej i przetestuj połączenie</li>
          <li>Zapisz konfigurację do pliku .env</li>
          <li>Uruchom migracje bazy danych z folderu supabase/migrations</li>
        </ol>
      </div>
    </div>
  );
};