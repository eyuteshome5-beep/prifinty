"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, MoreHorizontal, Star, Edit, Trash2, Film, Music, BookOpen, Loader2, Globe, Activity, ExternalLink, Copy, X
} from "lucide-react";
import { adminApi, discoveryAPI, itemsAPI, Item, NewItemData } from "@/lib/api";

const ITEM_TYPES = ["movie", "music", "book"] as const;
type ItemType = typeof ITEM_TYPES[number];

const typeColors: Record<ItemType, string> = {
  movie: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  music: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  book: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const TypeIcon = ({ type }: { type: string }) => {
  if (type === "movie") return <Film className="h-4 w-4" />;
  if (type === "music") return <Music className="h-4 w-4" />;
  if (type === "book") return <BookOpen className="h-4 w-4" />;
  return null;
};

const emptyForm = (): NewItemData => ({
  title: "",
  item_type: "movie",
  description: "",
  genre: "",
  cover_image: "",
  is_ethiopian: false,
  creator: "",
  spotify_id: "",
} as any);

export default function AdminItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<any>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [importSearchOpen, setImportSearchOpen] = useState(false);
  const [importQuery, setImportQuery] = useState("");
  const [importType, setImportType] = useState<ItemType>("movie");
  const [importResults, setImportResults] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [itemImporting, setItemImporting] = useState<string | null>(null);
  const [importIsEthiopian, setImportIsEthiopian] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [searchResults, setSearchResults] = useState<Item[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await itemsAPI.getItems({ per_page: 100 });
      setItems(response.items || []);
    } catch (error) {
      console.error("Failed to fetch items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setFormData(emptyForm());
    setFormError("");
    setShowDialog(true);
  };

  const openEditDialog = (item: Item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      item_type: item.item_type,
      description: item.description || "",
      genre: item.genre || "",
      cover_image: item.cover_image || "",
      is_ethiopian: item.is_ethiopian,
      creator: (item as any).creator || "",
      spotify_id: (item as any).spotify_id || "",
    });
    setFormError("");
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.item_type) {
      setFormError("Title and item type are required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      if (editingItem) {
        await adminApi.updateItem(editingItem.id, {
          title: formData.title,
          description: formData.description,
          genre: formData.genre,
          cover_image: formData.cover_image,
          is_ethiopian: formData.is_ethiopian,
        });
      } else {
        const newItemData: NewItemData = {
          title: formData.title,
          item_type: formData.item_type as "book" | "movie" | "music",
          description: formData.description,
          genre: formData.genre,
          cover_image: formData.cover_image,
          is_ethiopian: formData.is_ethiopian,
          ...(formData.item_type === "book" ? { author: formData.creator } : {}),
          ...(formData.item_type === "movie" ? { director: formData.creator } : {}),
          ...(formData.item_type === "music" ? { artist: formData.creator, spotify_id: formData.spotify_id } : {}),
        };
        await adminApi.addItem(newItemData);
      }
      await fetchItems();
      setShowDialog(false);
    } catch (error: any) {
      setFormError(error.message || "Failed to save item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportSearch = async () => {
    if (!importQuery.trim()) return;
    setImportLoading(true);
    try {
      const response = await adminApi.searchExternal(importType, importQuery);
      setImportResults(response.results || []);
    } catch (error) {
      console.error("Import Search Error:", error);
      alert("Failed to search external APIs.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportAction = async (item: any) => {
    setItemImporting(item.external_id);
    try {
      // Attempt to enrich missing metadata (description / cover image) before importing
      let payloadItem = { ...item };
      if ((!item.description || !item.cover_image) && item.title) {
        try {
          const res = await discoveryAPI.searchExternalPublic(importType, item.title);
          const match = res.results && res.results[0];
          if (match) {
            payloadItem = {
              ...payloadItem,
              description: payloadItem.description || match.description || match.overview || "",
              cover_image: payloadItem.cover_image || match.cover_image || match.image || "",
            };
          }
        } catch (e) {
          console.error("Metadata enrichment failed:", e);
        }
      }

      // Send a flag to mark this imported item as Ethiopian when requested
      const payload = { ...payloadItem, is_ethiopian: importIsEthiopian };
      await adminApi.importExternalItem(payload as any);
      await fetchItems();
      setImportSearchOpen(false);
    } catch (error) {
      console.error("Import Error:", error);
      alert("Failed to import item.");
    } finally {
      setItemImporting(null);
    }
  };

  const displayProvider = (p: string) => {
    if (!p) return '';
    return p.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Debounced autosuggest for import search
  useEffect(() => {
    const q = importQuery.trim();
    if (!q || q.length < 2) {
      setImportResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setImportLoading(true);
      try {
        const response = await adminApi.searchExternal(importType, q);
        setImportResults(response.results || []);
      } catch (err) {
        console.error('Import Search Error:', err);
      } finally {
        setImportLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [importQuery, importType]);

  // Auto-focus search input when import dialog opens
  useEffect(() => {
    if (importSearchOpen) {
      // Delay to ensure dialog is mounted
      setTimeout(() => importInputRef.current?.focus(), 50);
    }
  }, [importSearchOpen]);

  const handleDelete = async (item: Item) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteItem(item.id);
      await fetchItems();
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert("Failed to delete item.");
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || item.item_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // When admin types a query we use server-side admin search (debounced).
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const shouldEthiopianFirst = q.toLowerCase().includes('ethiop');
        const resp = await adminApi.searchItems(q, typeFilter === 'all' ? undefined : typeFilter, shouldEthiopianFirst);
        setSearchResults(resp.results || []);
      } catch (err) {
        console.error('Admin items search error', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, typeFilter]);

  const displayItems = searchResults !== null ? searchResults : filteredItems;

  const creatorLabel = (type: string) => {
    if (type === "book") return "Author";
    if (type === "movie") return "Director";
    if (type === "music") return "Artist";
    return "Creator";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Item Management</h1>
          <p className="text-muted-foreground">Manage movies, music, and books in the catalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" onClick={() => setImportSearchOpen(true)}>
            <Globe className="h-4 w-4 mr-2" />
            Import from Web
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="movie">Movies</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="book">Books</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
          <CardHeader>
          <CardTitle>All Items</CardTitle>
          <CardDescription>{displayItems.length} items found</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={typeColors[item.item_type as ItemType] || ""}
                    >
                      <TypeIcon type={item.item_type} />
                      <span className="ml-1 capitalize">{item.item_type}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.genre || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span className="font-medium">{item.avg_rating?.toFixed(1) ?? "—"}</span>
                      <span className="text-muted-foreground text-sm">({item.rating_count})</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.is_ethiopian && (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <Globe className="mr-1 h-3 w-3" />Ethiopian
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(item)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit Item
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {displayItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No items found. Click "Add Item" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the item details below." : "Fill in the details to add a new item to the catalog."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{formError}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  placeholder="e.g. Inception"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type *</label>
                <Select
                  value={formData.item_type}
                  onValueChange={(v) => setFormData({ ...formData, item_type: v })}
                  disabled={!!editingItem}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Movie</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="book">Book</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Genre</label>
                <Input
                  placeholder="e.g. Drama, Pop, Romance"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{creatorLabel(formData.item_type)}</label>
                <Input
                  placeholder={`e.g. ${formData.item_type === "book" ? "Haddis Alemayehu" : formData.item_type === "movie" ? "Christopher Nolan" : "Tilahun Gessesse"}`}
                  value={formData.creator}
                  onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                  disabled={!!editingItem}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Brief description of the item..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cover Image URL</label>
              <Input
                placeholder="https://example.com/cover.jpg"
                value={formData.cover_image}
                onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
              />
            </div>

            {formData.item_type === "music" && (
              <div className="space-y-2 border-l-2 border-purple-500 pl-4 py-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Music className="h-4 w-4 text-purple-500" />
                  Last.fm Track URL or MBID
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. https://www.last.fm/music/Artist/_/Track or MBID"
                    value={formData.spotify_id}
                    onChange={(e) => setFormData({ ...formData, spotify_id: e.target.value })}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Provide a Last.fm track URL or MBID. If empty, the system will attempt to find matching metadata.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <input
                type="checkbox"
                id="is_ethiopian"
                checked={formData.is_ethiopian}
                onChange={(e) => setFormData({ ...formData, is_ethiopian: e.target.checked })}
                className="rounded border-input w-4 h-4 accent-amber-500"
              />
              <label htmlFor="is_ethiopian" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Globe className="h-4 w-4 text-amber-500" />
                This is Ethiopian content
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unified Import Search Dialog */}
      <Dialog open={importSearchOpen} onOpenChange={setImportSearchOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-amber-500" />
              Import from Web
            </DialogTitle>
            <DialogDescription>
              Search movies (TMDB), music (iTunes/Last.fm), and books (Google) to import instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 py-4 items-start">
            <Select value={importType} onValueChange={(v: any) => setImportType(v)}>
              <SelectTrigger className="w-40 capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="movie">Movie</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="book">Book</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1">
              <div className="relative">
                <Input
                  placeholder={`Search ${importType}s (min 2 chars)`}
                  value={importQuery}
                  onChange={(e) => setImportQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleImportSearch()}
                  className="flex-1 pr-10"
                  ref={importInputRef}
                  aria-label={`Search ${importType}s`}
                />
                {importQuery && (
                  <button
                    onClick={() => setImportQuery("")}
                    aria-label="Clear search"
                    className="absolute right-12 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="import_is_ethiopian"
                  checked={importIsEthiopian}
                  onChange={(e) => setImportIsEthiopian(e.target.checked)}
                  className="rounded border-input w-4 h-4 accent-amber-500"
                />
                <label htmlFor="import_is_ethiopian" className="text-sm font-medium cursor-pointer">Mark imported items as Ethiopian</label>
              </div>
            </div>

            <Button onClick={handleImportSearch} disabled={importLoading} className="self-start">
              {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-[400px]">
            {importResults.map((item) => (
              <div key={item.external_id} className="flex gap-4 p-3 bg-secondary/30 rounded-xl border border-white/5 hover:border-primary/30 transition-all">
                {item.cover_image ? (
                  <img src={item.cover_image} alt={item.title} className="w-20 aspect-[2/3] object-cover rounded-lg bg-muted" />
                ) : (
                  <div className="w-20 aspect-[2/3] bg-muted flex items-center justify-center rounded-lg">
                    <TypeIcon type={importType} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{item.title}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{item.creator}</span>
                        {item.release_year && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <span>{item.release_year}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleImportAction(item)}
                      disabled={itemImporting === item.external_id}
                    >
                      {itemImporting === item.external_id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Plus className="h-3 w-3 mr-1" />
                      )}
                      Import
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                    {item.description}
                  </p>
                  {item.streaming_links && item.streaming_links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      {item.streaming_links.map((l: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded bg-primary/10 text-primary flex items-center gap-2"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {displayProvider(l.provider)}
                          </a>
                          <button
                            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              try {
                                if (navigator && (navigator as any).clipboard && l.url) {
                                  (navigator as any).clipboard.writeText(l.url);
                                  alert('Link copied to clipboard');
                                }
                              } catch (err) {}
                            }}
                            title="Copy link"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {item.popularity > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-[10px] text-muted-foreground">{item.popularity} score</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {!importLoading && importResults.length === 0 && importQuery && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mb-4 opacity-20" />
                <p>No results found for "{importQuery}"</p>
              </div>
            )}
            
            {!importQuery && !importLoading && importResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="h-10 w-10 mb-4 text-primary/20" />
                <p>Select a type and search to find media to import</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
