import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Edit, Save, X, PlusCircle, RotateCcw } from 'lucide-react';

// כתובת ה-API של הבקאנד
// כאשר מריצים ב-Docker Compose, הדפדפן ניגש דרך פורט 8000 של ה-Host
const API_BASE_URL = 'http://localhost:8000/api/users'; 

// קומפוננטת האפליקציה הראשית
const App = () => {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingEmail, setEditingEmail] = useState('');

  // פונקציה לטיפול בשגיאות
  const handleError = (err, message) => {
    console.error(err);
    setError(message || "אירעה שגיאה. אנא נסה שוב.");
    setLoading(false);
    setTimeout(() => setError(null), 5000); 
  };

  // פונקציה לשליפת המשתמשים
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      handleError(err, "שליפת המשתמשים נכשלה. ודא שהשרת פועל.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // הוספת משתמש חדש
  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim() || !email.trim()) {
      handleError(null, "שם ומייל הם שדות חובה.");
      return;
    }

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "יצירת משתמש נכשלה.");
      }

      setName('');
      setEmail('');
      fetchUsers();
    } catch (err) {
      handleError(err, err.message);
    } finally {
      setLoading(false);
    }
  };

  // התחלת מצב עריכה
  const startEdit = (user) => {
    setEditingId(user.id);
    setEditingName(user.name);
    setEditingEmail(user.email);
  };

  // שמירת שינויים
  const handleSaveEdit = async (id) => {
    setLoading(true);
    setError(null);

    if (!editingName.trim() || !editingEmail.trim()) {
      handleError(null, "שם ומייל אינם יכולים להיות ריקים.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName, email: editingEmail }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.detail || "עדכון משתמש נכשל.");
      }

      setEditingId(null);
      fetchUsers();
    } catch (err) {
      handleError(err, err.message);
    } finally {
      setLoading(false);
    }
  };

  // מחיקת משתמש
  const handleDelete = async (id) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק משתמש זה?")) {
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.detail || "מחיקת משתמש נכשלה.");
      }

      fetchUsers();
    } catch (err) {
      handleError(err, err.message);
    } finally {
      setLoading(false);
    }
  };

  // ממשק המשתמש (JSX)
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold text-blue-700 mb-6 border-b-4 border-blue-200 pb-2">
          פרויקט דוגמה: ניהול משתמשים (CRUD)
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          מערכת זו מדגימה את התקשורת בין React ל-FastAPI, תוך שימוש ב-MySQL לאחסון נתונים קבוע וב-Redis למטמון.
          <br/>
          שימו לב: פעולות שליפה (GET) מנצלות את המטמון של Redis למשך 30 שניות, ופעולות כתיבה/עדכון/מחיקה מנקות אותו.
        </p>

        {/* טופס הוספת משתמש */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-blue-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <PlusCircle className="w-5 h-5 ml-2 text-blue-500" />
            הוספת משתמש חדש
          </h2>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="שם מלא"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
              disabled={loading}
              required
            />
            <input
              type="email"
              placeholder="כתובת אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
              disabled={loading}
              required
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition duration-200 shadow-md disabled:opacity-50"
              disabled={loading || editingId !== null}
            >
              {loading && !editingId ? (
                <span>טוען...</span>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5 ml-2" />
                  הוספה
                </>
              )}
            </button>
          </form>
        </div>

        {/* רשימת משתמשים */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              רשימת משתמשים
            </h2>
            <button
              onClick={fetchUsers}
              className="text-gray-500 hover:text-blue-600 transition duration-150 p-1 rounded-full bg-gray-100"
              disabled={loading}
              title="רענן (ייתכן שיביא מהמטמון)"
            >
              <RotateCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {error && (
            <div className="bg-red-100 border-r-4 border-red-500 text-red-700 p-4 mb-4 rounded" role="alert">
              <p className="font-bold">שגיאה:</p>
              <p>{error}</p>
            </div>
          )}

          {loading && !users.length ? (
            <div className="text-center py-8 text-gray-500">טוען נתונים...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">לא נמצאו משתמשים. הוסף משתמש ראשון.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">שם</th>
                    <th className="px-6 py-3">אימייל</th>
                    <th className="px-6 py-3 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition duration-100">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                      
                      {editingId === user.id ? (
                        <>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="p-1 border rounded w-full border-indigo-400"
                              disabled={loading}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="email"
                              value={editingEmail}
                              onChange={(e) => setEditingEmail(e.target.value)}
                              className="p-1 border rounded w-full border-indigo-400"
                              disabled={loading}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center space-x-2 space-x-reverse">
                            <button
                              onClick={() => handleSaveEdit(user.id)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="שמור"
                              disabled={loading}
                            >
                              <Save className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-gray-500 hover:text-gray-700 p-1"
                              title="בטל"
                              disabled={loading}
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center space-x-2 space-x-reverse">
                            <button
                              onClick={() => startEdit(user)}
                              className="text-indigo-600 hover:text-indigo-900 p-1"
                              title="ערוך"
                              disabled={loading || editingId !== null}
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="מחק"
                              disabled={loading || editingId !== null}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;