import { useState } from "react";
import { 
  UserPlus, 
  Users, 
  HardHat, 
  UserX, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Plus, 
  RotateCcw,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { ViewIdModal } from "@/components/ui/ViewIdModal";
import { CustomerDetailsModal } from "@/components/ui/CustomerDetailsModal";
import { WorkerDetailsModal } from "@/components/ui/WorkerDetailsModal";
import { WorkerFormModal } from "@/components/ui/WorkerFormModal";

// --- Data Types ---
export interface PendingAccount {
  id: string;
  name: string;
  birthday: string;
  gender: string;
  address: string;
  phone: string;
  email: string;
  profileImage: string;
  idOneUrl?: string;
  idTwoUrl?: string;
}

export interface CustomerAccount extends PendingAccount {
  customerId: string;
  badRecords: number;
}

export interface WorkerAccount extends PendingAccount {
  workerId: string;
  password?: string;
}

export interface RemovedAccount {
  id: string;
  type: "Customer" | "Worker";
  account: CustomerAccount | WorkerAccount;
}

// --- Initial Mock Data matching reference screenshots ---
const INITIAL_PENDING: PendingAccount[] = [
  { id: "p1", name: "Sherwynn James Misula", birthday: "09/11/1995", gender: "Real Men", address: "Korea", phone: "0911324567", email: "0911324567", profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80" },
  { id: "p2", name: "Shermaine Misula", birthday: "09/11/1995", gender: "Gender Neutral", address: "Korea", phone: "0911324567", email: "0911324567", profileImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80" },
];

const INITIAL_CUSTOMERS: CustomerAccount[] = [
  { id: "c1", customerId: "676767676767", name: "Sherwynn James Misula", birthday: "09/11/1995", gender: "Real Men", address: "Korea", phone: "098574641", email: "09/11/1995", profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80", badRecords: 0 },
  { id: "c2", customerId: "676767676767", name: "Shermaine James Misula", birthday: "09/11/1995", gender: "Gender Neutral", address: "Thailand", phone: "09879165454", email: "09/11/1995", profileImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80", badRecords: 1 },
  { id: "c3", customerId: "676767676767", name: "Sherwynn James Misula", birthday: "09/11/1995", gender: "Real Men", address: "Korea", phone: "098574641", email: "09/11/1995", profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80", badRecords: 2 },
];

const INITIAL_WORKERS: WorkerAccount[] = [
  { id: "w1", workerId: "676767676767", name: "Sherwynn James Misula", birthday: "09/11/1995", gender: "Real Men", address: "Korea", phone: "098574641", email: "09/11/1995", password: "password123", profileImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80" },
  { id: "w2", workerId: "676767676767", name: "Shermaine James Misula", birthday: "09/11/1995", gender: "Gender Neutral", address: "Thailand", phone: "09879165454", email: "09/11/1995", password: "workersecret", profileImage: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&auto=format&fit=crop&q=80" },
];

const INITIAL_REMOVED: RemovedAccount[] = [
  { id: "r1", type: "Worker", account: { id: "w99", workerId: "676767676767", name: "Sherwynn James Misula", birthday: "09/11/1995", gender: "Real Men", address: "Korea", phone: "098574641", email: "09/11/1995", profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80" } },
  { id: "r2", type: "Customer", account: { id: "c99", customerId: "676767676767", name: "Shermaine James Misula", birthday: "09/11/1995", gender: "Gender Neutral", address: "Thailand", phone: "09879165454", email: "09/11/1995", badRecords: 2, profileImage: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80" } },
];

export default function AccountsDashboard() {
  const [activeTab, setActiveTab] = useState<"Pending" | "Customer" | "Worker" | "Removed">("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // States for lists
  const [pendingList, setPendingList] = useState<PendingAccount[]>(INITIAL_PENDING);
  const [customerList, setCustomerList] = useState<CustomerAccount[]>(INITIAL_CUSTOMERS);
  const [workerList, setWorkerList] = useState<WorkerAccount[]>(INITIAL_WORKERS);
  const [removedList, setRemovedList] = useState<RemovedAccount[]>(INITIAL_REMOVED);

  // Modal States
  const [viewIdAccount, setViewIdAccount] = useState<PendingAccount | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<WorkerAccount | null>(null);
  const [workerFormModalOpen, setWorkerFormModalOpen] = useState(false);
  const [workerToEdit, setWorkerToEdit] = useState<WorkerAccount | null>(null);

  // --- Handlers ---
  const handleAcceptPending = (pending: PendingAccount) => {
    setPendingList(pendingList.filter((p) => p.id !== pending.id));
    const newCustomer: CustomerAccount = {
      ...pending,
      customerId: String(Date.now()),
      badRecords: 0,
    };
    setCustomerList([newCustomer, ...customerList]);
  };

  const handleRejectPending = (id: string) => {
    setPendingList(pendingList.filter((p) => p.id !== id));
  };

  const handleRemoveCustomer = (customer: CustomerAccount) => {
    setCustomerList(customerList.filter((c) => c.id !== customer.id));
    setRemovedList([{ id: String(Date.now()), type: "Customer", account: customer }, ...removedList]);
  };

  const handleRemoveWorker = (worker: WorkerAccount) => {
    setWorkerList(workerList.filter((w) => w.id !== worker.id));
    setRemovedList([{ id: String(Date.now()), type: "Worker", account: worker }, ...removedList]);
  };

  const handleUnremoveAccount = (item: RemovedAccount) => {
    setRemovedList(removedList.filter((r) => r.id !== item.id));
    if (item.type === "Customer") {
      setCustomerList([item.account as CustomerAccount, ...customerList]);
    } else {
      setWorkerList([item.account as WorkerAccount, ...workerList]);
    }
  };

  const handleSaveWorker = (workerData: Partial<WorkerAccount>) => {
    if (workerToEdit) {
      setWorkerList(workerList.map((w) => (w.id === workerToEdit.id ? ({ ...w, ...workerData } as WorkerAccount) : w)));
    } else {
      const newWorker: WorkerAccount = {
        id: String(Date.now()),
        workerId: String(Date.now()),
        name: workerData.name || "",
        birthday: workerData.birthday || "",
        gender: workerData.gender || "Real Men",
        address: workerData.address || "",
        phone: workerData.phone || "",
        email: workerData.email || "",
        password: workerData.password || "default123",
        profileImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80",
      };
      setWorkerList([newWorker, ...workerList]);
    }
    setWorkerToEdit(null);
  };

  const tabs = [
    { name: "Pending Accounts", key: "Pending", icon: UserPlus, count: pendingList.length },
    { name: "Customer Accounts", key: "Customer", icon: Users, count: customerList.length },
    { name: "Worker Accounts", key: "Worker", icon: HardHat, count: workerList.length },
    { name: "Removed Accounts", key: "Removed", icon: UserX, count: removedList.length },
  ];

  return (
    <section className="bg-[#EBE9E1] min-h-screen w-full py-10 px-4 sm:px-6 relative font-sans">
      
      {/* Modals */}
      <ViewIdModal 
        isOpen={!!viewIdAccount} 
        onClose={() => setViewIdAccount(null)} 
        accountName={viewIdAccount?.name || ""} 
      />
      
      <CustomerDetailsModal 
        isOpen={!!selectedCustomer} 
        onClose={() => setSelectedCustomer(null)} 
        customer={selectedCustomer} 
      />

      <WorkerDetailsModal 
        isOpen={!!selectedWorker} 
        onClose={() => setSelectedWorker(null)} 
        worker={selectedWorker} 
      />

      <WorkerFormModal 
        isOpen={workerFormModalOpen} 
        onClose={() => { setWorkerFormModalOpen(false); setWorkerToEdit(null); }} 
        workerToEdit={workerToEdit} 
        onSave={handleSaveWorker} 
      />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        
        {/* SIDEBAR NAVIGATION (#E3DFD3 background) */}
        <aside className="w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6">
          <div>
            <div 
              className="flex items-center justify-between cursor-pointer pb-3"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <h3 className="font-black text-gray-900 text-base">Accounts Center</h3>
              </div>
              <button className="text-gray-600 hover:text-gray-900">
                {isSidebarOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {isSidebarOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/60 overflow-hidden">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 text-xs sm:text-sm font-bold transition-all rounded-none ${
                        isSelected 
                          ? "bg-white text-gray-900 border-l-4 border-[#3087C5] shadow-xs" 
                          : "bg-white/40 text-gray-700 hover:bg-white/70 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4 h-4 text-[#3087C5]" />
                        <span className="truncate text-left">{tab.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-200/60 px-2.5 py-0.5 rounded-full shrink-0">
                        ({tab.count})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 w-full space-y-5">
          
          {/* Header & Search Bar */}
          <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-black text-[#3087C5]">
              {activeTab === "Pending" && `New Accounts: ${pendingList.length}`}
              {activeTab === "Customer" && `Customer Accounts: ${customerList.length.toLocaleString()}`}
              {activeTab === "Worker" && `Worker Accounts: ${workerList.length}`}
              {activeTab === "Removed" && `Removed Accounts: ${removedList.length}`}
            </h2>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              {/* Search Bar matching reference image[cite: 11, 12, 13, 14] */}
              <div className="relative w-full sm:w-72 flex items-center">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-full py-2 pl-4 pr-10 text-sm font-medium focus:outline-none focus:border-[#3087C5]"
                />
                <button
                  type="button"
                  className="absolute right-1 bg-[#3087C5] text-white p-2 rounded-full hover:bg-[#256fa4]"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* New Worker Button */}
              {activeTab === "Worker" && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => { setWorkerToEdit(null); setWorkerFormModalOpen(true); }}
                  className="rounded-full shadow-md font-bold shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>New Worker</span>
                </Button>
              )}
            </div>
          </div>

          {/* TAB 1: PENDING ACCOUNTS[cite: 11] */}
          {activeTab === "Pending" && (
            <div className="space-y-4">
              {pendingList.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-5">
                  <div className="w-32 h-36 rounded-2xl overflow-hidden border border-gray-200 shrink-0">
                    <img src={item.profileImage} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-1 text-xs font-semibold text-gray-700">
                    <p><span className="font-bold text-gray-900">Name:</span> <span className="text-[#3087C5] font-bold">{item.name}</span></p>
                    <p><span className="font-bold text-gray-900">Birthday:</span> <span className="text-[#3087C5]">{item.birthday}</span></p>
                    <p><span className="font-bold text-gray-900">Gender:</span> <span className="text-[#3087C5]">{item.gender}</span></p>
                    <p><span className="font-bold text-gray-900">Address:</span> <span className="text-[#3087C5]">{item.address}</span></p>
                    <p><span className="font-bold text-gray-900">Phone Number:</span> <span className="text-[#3087C5]">{item.phone}</span></p>
                    <p><span className="font-bold text-gray-900">Email:</span> <span className="text-[#3087C5]">{item.email}</span></p>

                    <div className="flex flex-wrap items-center gap-2 pt-3">
                      <Button variant="gold" size="sm" onClick={() => handleAcceptPending(item)} className="rounded-full font-bold px-4">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        <span>Accept</span>
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => setViewIdAccount(item)} className="rounded-full font-bold px-4">
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        <span>View ID</span>
                      </Button>
                      <Button variant="white" size="sm" onClick={() => handleRejectPending(item.id)} className="rounded-full font-bold border-gray-300 px-4">
                        <XCircle className="w-3.5 h-3.5 mr-1 text-gray-900" />
                        <span className="text-gray-900">Reject</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: CUSTOMER ACCOUNTS[cite: 12] */}
          {activeTab === "Customer" && (
            <div className="space-y-4">
              {customerList.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-5">
                  <div className="w-32 h-36 rounded-2xl overflow-hidden border border-gray-200 shrink-0">
                    <img src={item.profileImage} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-1 text-xs font-semibold text-gray-700">
                    <p><span className="font-bold text-gray-900">Customer ID:</span> <span className="text-[#3087C5] font-bold">{item.customerId}</span></p>
                    <p><span className="font-bold text-gray-900">Name:</span> <span className="text-[#3087C5] font-bold">{item.name}</span></p>
                    <p><span className="font-bold text-gray-900">Birthday:</span> <span className="text-[#3087C5]">{item.birthday}</span></p>
                    <p><span className="font-bold text-gray-900">Gender:</span> <span className="text-[#3087C5]">{item.gender}</span></p>
                    <p><span className="font-bold text-gray-900">Address:</span> <span className="text-[#3087C5]">{item.address}</span></p>
                    <p><span className="font-bold text-gray-900">Phone Number:</span> <span className="text-[#3087C5]">{item.phone}</span></p>
                    <p><span className="font-bold text-gray-900">Email:</span> <span className="text-[#3087C5]">{item.email}</span></p>

                    <div className="flex flex-wrap items-center gap-2 pt-3">
                      <Button variant="primary" size="sm" onClick={() => setSelectedCustomer(item)} className="rounded-full font-bold px-4">
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        <span>View Details</span>
                      </Button>
                      <Button variant="white" size="sm" onClick={() => handleRemoveCustomer(item)} className="rounded-full font-bold border-gray-300 px-4">
                        <XCircle className="w-3.5 h-3.5 mr-1 text-gray-900" />
                        <span className="text-gray-900">{item.badRecords >= 2 ? "Ban Account" : "Remove Account"}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: WORKER ACCOUNTS[cite: 13] */}
          {activeTab === "Worker" && (
            <div className="space-y-4">
              {workerList.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-5">
                  <div className="w-32 h-36 rounded-2xl overflow-hidden border border-gray-200 shrink-0">
                    <img src={item.profileImage} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-1 text-xs font-semibold text-gray-700">
                    <p><span className="font-bold text-gray-900">Worker ID:</span> <span className="text-[#3087C5] font-bold">{item.workerId}</span></p>
                    <p><span className="font-bold text-gray-900">Name:</span> <span className="text-[#3087C5] font-bold">{item.name}</span></p>
                    <p><span className="font-bold text-gray-900">Birthday:</span> <span className="text-[#3087C5]">{item.birthday}</span></p>
                    <p><span className="font-bold text-gray-900">Gender:</span> <span className="text-[#3087C5]">{item.gender}</span></p>
                    <p><span className="font-bold text-gray-900">Address:</span> <span className="text-[#3087C5]">{item.address}</span></p>
                    <p><span className="font-bold text-gray-900">Phone Number:</span> <span className="text-[#3087C5]">{item.phone}</span></p>
                    <p><span className="font-bold text-gray-900">Email:</span> <span className="text-[#3087C5]">{item.email}</span></p>

                    <div className="flex flex-wrap items-center gap-2 pt-3">
                      <Button variant="primary" size="sm" onClick={() => setSelectedWorker(item)} className="rounded-full font-bold px-4">
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        <span>View Details</span>
                      </Button>
                      <Button variant="gold" size="sm" onClick={() => { setWorkerToEdit(item); setWorkerFormModalOpen(true); }} className="rounded-full font-bold px-4">
                        <Edit className="w-3.5 h-3.5 mr-1" />
                        <span>Edit</span>
                      </Button>
                      <Button variant="white" size="sm" onClick={() => handleRemoveWorker(item)} className="rounded-full font-bold border-gray-300 px-4">
                        <XCircle className="w-3.5 h-3.5 mr-1 text-gray-900" />
                        <span className="text-gray-900">Remove Account</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: REMOVED ACCOUNTS[cite: 14] */}
          {activeTab === "Removed" && (
            <div className="space-y-4">
              {removedList.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-5">
                  <div className="w-32 h-36 rounded-2xl overflow-hidden border border-gray-200 shrink-0">
                    <img src={item.account.profileImage} alt={item.account.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-1 text-xs font-semibold text-gray-700">
                    <p><span className="font-bold text-gray-900">{item.type} ID:</span> <span className="text-[#3087C5] font-bold">676767676767</span></p>
                    <p><span className="font-bold text-gray-900">Name:</span> <span className="text-[#3087C5] font-bold">{item.account.name}</span></p>
                    <p><span className="font-bold text-gray-900">Birthday:</span> <span className="text-[#3087C5]">{item.account.birthday}</span></p>
                    <p><span className="font-bold text-gray-900">Gender:</span> <span className="text-[#3087C5]">{item.account.gender}</span></p>
                    <p><span className="font-bold text-gray-900">Address:</span> <span className="text-[#3087C5]">{item.account.address}</span></p>
                    <p><span className="font-bold text-gray-900">Phone Number:</span> <span className="text-[#3087C5]">{item.account.phone}</span></p>
                    <p><span className="font-bold text-gray-900">Email:</span> <span className="text-[#3087C5]">{item.account.email}</span></p>

                    <div className="flex flex-wrap items-center gap-2 pt-3">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => {
                          if (item.type === "Customer") setSelectedCustomer(item.account as CustomerAccount);
                          else setSelectedWorker(item.account as WorkerAccount);
                        }} 
                        className="rounded-full font-bold px-4"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        <span>View Details</span>
                      </Button>
                      <Button variant="white" size="sm" onClick={() => handleUnremoveAccount(item)} className="rounded-full font-bold border-gray-300 px-4">
                        <RotateCcw className="w-3.5 h-3.5 mr-1 text-gray-900" />
                        <span className="text-gray-900">Unremoved</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </section>
  );
}