import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCards, createCard, updateCard, deleteCard } from '@/store/slices/cardsSlice';
import { fetchUsers } from '@/store/slices/usersSlice';
import { CreditCard, Plus, Search, Trash2, Edit, X, Loader2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const CardsPage = () => {
  const dispatch = useAppDispatch();
  const { cards, isLoading } = useAppSelector((state) => state.cards);
  const { users } = useAppSelector((state) => state.users);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [formData, setFormData] = useState({
    card_uid: '',
    user_id: '',
    status: 'active',
  });

  useEffect(() => {
    dispatch(fetchCards());
    dispatch(fetchUsers());
  }, [dispatch]);

  const filteredCards = cards.filter((card: any) =>
    card.card_uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddModal = () => {
    setEditingCard(null);
    setFormData({ card_uid: '', user_id: '', status: 'active' });
    setIsModalOpen(true);
  };

  const openEditModal = (card: any) => {
    setEditingCard(card);
    setFormData({
      card_uid: card.card_uid,
      user_id: card.user_id?.toString() || '',
      status: card.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const data = {
      card_uid: formData.card_uid,
      user_id: formData.user_id ? Number(formData.user_id) : undefined,
      status: formData.status,
    };
    try {
      if (editingCard) {
        await dispatch(
          updateCard({ id: editingCard.card_id, data })
        ).unwrap();
        toast({ title: 'Card updated successfully' });
      } else {
        await dispatch(createCard(data)).unwrap();
        toast({ title: 'Card created successfully' });
      }
      setIsModalOpen(false);
      dispatch(fetchCards());
    } catch (error) {
      toast({ title: 'Operation failed', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await dispatch(deleteCard(id)).unwrap();
        toast({ title: 'Card deleted successfully' });
      } catch (error) {
        toast({ title: 'Failed to delete card', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Cards Management</h1>
          <p className="text-muted-foreground mt-1">Manage access cards</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-64"
            />
          </div>
          <button onClick={openAddModal} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add Card
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No cards found</p>
          </div>
        ) : (
          filteredCards.map((card: any) => (
            <div key={card.card_id} className="card-elevated p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/10">
                    <CreditCard className="h-6 w-6 text-info" />
                  </div>
                  <span
                    className={`badge ${
                      card.status === 'active' ? 'badge-success' : 'badge-danger'
                    }`}
                  >
                    {card.status}
                  </span>
                </div>
                <h3 className="text-lg font-mono font-semibold text-foreground mb-2">
                  {card.card_uid}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {card.name || 'Unassigned'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(card)}
                    className="flex-1 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(card.card_id)}
                    className="flex-1 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4 inline mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-lg max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                {editingCard ? 'Edit Card' : 'Add New Card'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Card UID
                </label>
                <input
                  type="text"
                  value={formData.card_uid}
                  onChange={(e) => setFormData({ ...formData, card_uid: e.target.value })}
                  placeholder="e.g., A1234567"
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Assign User
                </label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select a user</option>
                  {users.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="btn-outline flex-1">
                  Cancel
                </button>
                <button onClick={handleSubmit} className="btn-primary flex-1">
                  <Check className="h-4 w-4" />
                  {editingCard ? 'Save Changes' : 'Add Card'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardsPage;
