import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api, { errMsg } from '../services/api';
import { LoadingSpinner, EmptyState, Modal } from '../components/Feedback';

const tabs = [['books', 'Books'], ['copies', 'Copies'], ['authors', 'Authors'], ['categories', 'Categories'], ['publishers', 'Publishers']];

const AdminCatalog = ({ tab = 'books', create: autoCreate, edit }) => {
  const [active, setActive] = useState(tab);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!autoCreate);
  const [editing, setEditing] = useState(null);
  const { register, handleSubmit, reset, setValue } = useForm();

  const endpoint = active === 'copies' ? '/book-copies' : active === 'categories' ? '/categories' : `/${active}`;

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(endpoint, { params: { limit: 30 } });
      setItems(data.data);
    } catch (e) { setItems([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [active]);
  useEffect(() => { setActive(tab); }, [tab]);

  const openEdit = (it) => {
    setEditing(it);
    Object.entries(it).forEach(([k, v]) => { if (typeof v === 'string' || typeof v === 'number') setValue(k, v); });
    setShowForm(true);
  };

  const submit = async (v) => {
    try {
      const payload = { ...v };
      if (active === 'books') {
        if (typeof payload.authors === 'string') payload.authors = payload.authors.split(',').map((s) => s.trim()).filter(Boolean);
        if (typeof payload.categories === 'string') payload.categories = payload.categories.split(',').map((s) => s.trim()).filter(Boolean);
        if (!payload.publisher) delete payload.publisher;
      }
      if (editing) await api.put(`${endpoint}/${editing._id}`, payload);
      else await api.post(endpoint, payload);
      setShowForm(false); setEditing(null); reset(); load();
    } catch (e) { alert(errMsg(e)); }
  };

  const remove = async (id) => {
    if (!confirm('Delete? Blocked if referenced by books/loans.')) return;
    try { await api.delete(`${endpoint}/${id}`); load(); } catch (e) { alert(errMsg(e)); }
  };

  const label = (it) => it.title || it.name || it.accessionNumber || it._id;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setActive(k)} className={active === k ? 'btn-primary !px-3 !py-1.5' : 'btn-secondary !px-3 !py-1.5'}>{l}</button>
        ))}
        <button className="btn-primary ml-auto !px-3 !py-1.5" onClick={() => { setEditing(null); reset(); setShowForm(true); }}>+ New</button>
      </div>
      {loading ? <LoadingSpinner /> : items.length === 0 ? <div className="mt-4"><EmptyState title={`No ${active}`} /></div> : (
        <div className="card mt-4 overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Name / Title</th><th>Detail</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((it) => (
                <tr key={it._id}>
                  <td className="font-semibold">{label(it)}<br /><span className="font-mono text-xs text-slate-400">{it._id}</span></td>
                  <td className="text-xs text-slate-500">
                    {it.fullName || it.status || ''} {it.availableCopies !== undefined ? `${it.availableCopies}/${it.totalCopies} avail` : ''} {it.copyNumber ? `#${it.copyNumber}` : ''}
                  </td>
                  <td className="whitespace-nowrap">
                    <button className="text-xs text-indigo-600 hover:underline" onClick={() => openEdit(it)}>Edit</button>
                    <button className="ml-2 text-xs text-red-600 hover:underline" onClick={() => remove(it._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">Books: authors/categories as comma-separated IDs (copy from Authors/Categories tables). Counters are managed by copies/loans, not editable. {edit ? 'Edit mode via /:id/edit route.' : ''}</p>
      <Modal open={showForm} title={`${editing ? 'Edit' : 'New'} ${active}`} onClose={() => { setShowForm(false); setEditing(null); }}>
        <form onSubmit={handleSubmit(submit)} className="space-y-2">
          {active === 'books' && (<>
            <input className="input" placeholder="Title*" {...register('title', { required: !editing })} />
            <input className="input" placeholder="Author IDs (comma-separated)*" {...register('authors', { required: !editing })} />
            <input className="input" placeholder="Category IDs (comma-separated)" {...register('categories')} />
            <input className="input" placeholder="Publisher ID" {...register('publisher')} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="ISBN-13" {...register('isbn13')} />
              <input className="input" placeholder="Language" {...register('language')} />
              <input className="input" placeholder="Edition" {...register('edition')} />
              <input className="input" placeholder="Shelf" {...register('shelfLocation')} />
            </div>
            <textarea className="input" placeholder="Description" {...register('description')} />
          </>)}
          {active === 'copies' && (<>
            <input className="input font-mono" placeholder="Book ID*" {...register('book', { required: !editing })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Accession (auto)" {...register('accessionNumber')} />
              <input className="input" placeholder="Barcode (auto)" {...register('barcode')} />
              <select className="input" {...register('status')}><option value="">Status…</option><option>AVAILABLE</option><option>DAMAGED</option><option>LOST</option><option>MAINTENANCE</option></select>
              <input className="input" placeholder="Shelf" {...register('shelfLocation')} />
            </div>
          </>)}
          {active === 'authors' && (<>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="First name*" {...register('firstName', { required: !editing })} />
              <input className="input" placeholder="Last name*" {...register('lastName', { required: !editing })} />
            </div>
            <input className="input" placeholder="Nationality" {...register('nationality')} />
            <textarea className="input" placeholder="Biography" {...register('biography')} />
          </>)}
          {active === 'categories' && (<>
            <input className="input" placeholder="Name*" {...register('name', { required: !editing })} />
            <input className="input" placeholder="Description" {...register('description')} />
          </>)}
          {active === 'publishers' && (<>
            <input className="input" placeholder="Name*" {...register('name', { required: !editing })} />
            <input className="input" placeholder="Country" {...register('country')} />
          </>)}
          <button className="btn-primary w-full">{editing ? 'Save' : 'Create'}</button>
        </form>
      </Modal>
    </div>
  );
};

export default AdminCatalog;
