"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Plus, 
  Filter,
  Eye,
  MoreHorizontal,
  Globe,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Truck,
  Users,
  Database,
  TestTube,
  XCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  getCurrentUser,
  getContractsByUser,
  getDashboardStats
} from "@/lib/mock-data";
import { graphqlClient, handleGraphQLError } from "@/lib/graphql/client";
import { GET_ALL_ESCROWS } from "@/lib/graphql/queries";
import type { Escrow, EscrowsResponse } from "@/lib/graphql/client";

export default function ContractsPage() {
  const { address: account } = useAccount();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [realEscrows, setRealEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use mock data
  const currentUser = getCurrentUser();
  const contracts = getContractsByUser(currentUser.id);
  const stats = getDashboardStats(currentUser.id);
  
  // Fetch real escrows from Ponder
  const fetchRealEscrows = async () => {
    try {
      const data = await graphqlClient.request<EscrowsResponse>(GET_ALL_ESCROWS);
      setRealEscrows(data.escrows.items);
    } catch (error) {
      console.error("Failed to fetch escrows:", handleGraphQLError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealEscrows();
    const interval = setInterval(fetchRealEscrows, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);
  
  const formatIDRX = (amount: number) => {
    return `IDR ${amount.toLocaleString('id-ID')}`;
  };
  
  // Filter and sort contracts
  const filteredContracts = contracts
    .filter(contract => {
      if (statusFilter !== "all" && contract.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return contract.contractNumber.toLowerCase().includes(query) ||
               contract.description.toLowerCase().includes(query) ||
               contract.buyer.name.toLowerCase().includes(query) ||
               contract.seller.name.toLowerCase().includes(query) ||
               contract.buyer.company.toLowerCase().includes(query) ||
               contract.seller.company.toLowerCase().includes(query);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "amount-high") return b.amount - a.amount;
      if (sortBy === "amount-low") return a.amount - b.amount;
      return 0;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'funded': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'documents_pending': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'settled': return 'bg-green-100 text-green-800 border-green-200';
      case 'disputed': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'created': return <Clock className="h-4 w-4" />;
      case 'funded': return <DollarSign className="h-4 w-4" />;
      case 'documents_pending': return <FileText className="h-4 w-4" />;
      case 'settled': return <CheckCircle className="h-4 w-4" />;
      case 'disputed': return <AlertCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="content-spacing">
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contracts</h1>
          <p className="text-gray-600 text-lg">
            Manage your escrow contracts and track their progress
          </p>
        </div>
        <Link href="/contracts/new">
          <Button className="btn-premium bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <Card className="gradient-card-blue hover-lift shadow-lg">
          <CardContent className="stats-card-content">
            <div className="stats-icon bg-blue-500">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div className="stats-value text-blue-900">{stats.totalContracts}</div>
            <div className="stats-label text-blue-700">Total Contracts</div>
          </CardContent>
        </Card>

        <Card className="gradient-card-blue hover-lift shadow-lg">
          <CardContent className="stats-card-content">
            <div className="stats-icon bg-blue-500">
              <Clock className="h-7 w-7 text-white" />
            </div>
            <div className="stats-value text-blue-900">{stats.activeContracts}</div>
            <div className="stats-label text-blue-700">Active</div>
          </CardContent>
        </Card>

        <Card className="gradient-card-green hover-lift shadow-lg">
          <CardContent className="stats-card-content">
            <div className="stats-icon bg-green-500">
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
            <div className="stats-value text-green-900">{stats.settledContracts}</div>
            <div className="stats-label text-green-700">Settled</div>
          </CardContent>
        </Card>

        <Card className="gradient-card-orange hover-lift shadow-lg">
          <CardContent className="stats-card-content">
            <div className="stats-icon bg-orange-500">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
            <div className="stats-value text-orange-900">{formatIDRX(stats.totalValue)}</div>
            <div className="stats-label text-orange-700">Total Value</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="modern-card">
        <CardContent className="p-0">
          <div className="filter-bar">
            <div className="filter-input">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input 
                  placeholder="Search contracts..." 
                  className="pl-12 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-12 rounded-xl border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="funded">Funded</SelectItem>
                <SelectItem value="documents_pending">Documents Pending</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36 h-12 rounded-xl border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="amount-high">Amount (High)</SelectItem>
                <SelectItem value="amount-low">Amount (Low)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-12 px-6 rounded-xl border-gray-200 hover:bg-gray-50">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real Blockchain Contracts */}
      <Card className="modern-card border-green-200 bg-green-50/50">
        <CardHeader className="pb-6">
          <div className="flex-between">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-green-600" />
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-1">Blockchain Contracts (Live)</CardTitle>
                <p className="text-gray-600">Real escrows from Lisk Sepolia blockchain</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-200">
              {loading ? 'Loading...' : `${realEscrows.length} contracts`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
                </div>
              </div>
            ) : realEscrows.length === 0 ? (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No blockchain contracts found</p>
              </div>
            ) : (
              <div className="card-spacing">
                {realEscrows.map((escrow) => {
                  const isBuyer = escrow.buyer === account?.toLowerCase();
                  const isSeller = escrow.seller === account?.toLowerCase();
                  const role = isBuyer ? 'Buyer' : isSeller ? 'Seller' : 'Viewer';
                  const counterpartyAddress = isBuyer ? escrow.seller : escrow.buyer;
                  const counterpartyRole = isBuyer ? 'Seller' : 'Buyer';
                  
                  return (
                    <div key={escrow.id} className="contract-item border-green-200 bg-green-50/20">
                      <div className="flex items-center gap-8">
                        {/* Your Role */}
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                            <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                              {(isBuyer || isSeller) ? 'YOU' : 'N/A'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-gray-900">{role} {(isBuyer || isSeller) && '(You)'}</p>
                            <p className="text-sm text-gray-600 font-mono text-green-700">
                              {(isBuyer || isSeller) ? `${account?.slice(0, 6)}...${account?.slice(-4)}` : 'Not Involved'}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Database className="h-3 w-3" />
                              <span>Blockchain Address</span>
                            </div>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-px bg-gray-300"></div>
                          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                          <div className="w-8 h-px bg-gray-300"></div>
                        </div>

                        {/* Counterparty */}
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                            <AvatarFallback className="bg-green-100 text-green-700 font-semibold">
                              {counterpartyAddress.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-gray-900">{counterpartyRole}</p>
                            <p className="text-sm text-gray-600 font-mono text-green-700">
                              {counterpartyAddress.slice(0, 6)}...{counterpartyAddress.slice(-4)}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Database className="h-3 w-3" />
                              <span>Blockchain Address</span>
                            </div>
                          </div>
                        </div>

                        {/* Contract Details */}
                        <div>
                          <p className="font-medium text-gray-900">Contract #{escrow.id.slice(0, 10)}...</p>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(escrow.createdAt * 1000), { addSuffix: true })}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Escrow ID: {escrow.id.slice(0, 20)}...</p>
                        </div>
                      </div>

                      {/* Right Side - Amount, Status, Actions */}
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-700 mb-1">
                            {formatIDRX(Number(escrow.amount) / 100)}
                          </div>
                          <p className="text-sm text-gray-600">IDRX</p>
                        </div>

                        <div className="text-center">
                          <Badge className={`${
                            escrow.status === "SETTLED" ? "bg-green-100 text-green-800 border-green-200" :
                            escrow.status === "FUNDED" ? "bg-purple-100 text-purple-800 border-purple-200" :
                            escrow.status === "DOCUMENTS_PENDING" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                            escrow.status === "DISPUTED" ? "bg-red-100 text-red-800 border-red-200" :
                            escrow.status === "CANCELLED" ? "bg-gray-100 text-gray-800 border-gray-200" :
                            "bg-gray-100 text-gray-800 border-gray-200"
                          } border font-medium mb-2`}>
                            {escrow.status === "FUNDED" && <DollarSign className="h-3 w-3 mr-1" />}
                            {escrow.status === "DOCUMENTS_PENDING" && <FileText className="h-3 w-3 mr-1" />}
                            {escrow.status === "SETTLED" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {escrow.status === "DISPUTED" && <AlertCircle className="h-3 w-3 mr-1" />}
                            {escrow.status === "CANCELLED" && <XCircle className="h-3 w-3 mr-1" />}
                            <span className="capitalize">{escrow.status.toLowerCase().replace('_', ' ')}</span>
                          </Badge>
                          <p className="text-xs text-gray-600 font-medium">
                            Created on chain
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Link href={`/contracts/${escrow.id}`}>
                            <Button variant="ghost" size="sm" className="hover:bg-green-50 hover:text-green-700">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Separator */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center">
          <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 flex items-center gap-2">
            <TestTube className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Mock Data Below (For UI Demo)</span>
          </div>
        </div>
      </div>

      {/* Mock Contracts List */}
      <Card className="modern-card border-orange-200 bg-orange-50/30">
        <CardHeader className="pb-6">
          <div className="flex-between">
            <div className="flex items-center gap-3">
              <TestTube className="h-6 w-6 text-orange-600" />
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-1">Mock Contracts (Demo UI)</CardTitle>
                <p className="text-gray-600">Sample data for UI demonstration</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="card-spacing">
            {filteredContracts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filters or create a new contract</p>
                <Link href="/contracts/new">
                  <Button className="btn-premium">Create Contract</Button>
                </Link>
              </div>
            ) : (
              filteredContracts.map((contract) => {
                const isBuyer = contract.buyer.id === currentUser.id;
                const counterparty = isBuyer ? contract.seller : contract.buyer;
                const role = isBuyer ? 'Buyer' : 'Seller';
                const counterpartyRole = isBuyer ? 'Seller' : 'Buyer';
                
                return (
                <div key={contract.id} className="contract-item">
                  <div className="flex items-center gap-8">
                    {/* Your Role */}
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                        <AvatarImage src={currentUser.avatar} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                          {currentUser.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900">{role} (You)</p>
                        <p className="text-sm text-gray-600">{currentUser.company}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Globe className="h-3 w-3" />
                          <span>{currentUser.country}</span>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-px bg-gray-300"></div>
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <div className="w-8 h-px bg-gray-300"></div>
                    </div>

                    {/* Counterparty */}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                        <AvatarImage src={counterparty.avatar} />
                        <AvatarFallback className="bg-green-100 text-green-700 font-semibold">
                          {counterparty.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900">{counterpartyRole}</p>
                        <p className="text-sm text-gray-600">{counterparty.company}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Globe className="h-3 w-3" />
                          <span>{counterparty.country}</span>
                        </div>
                      </div>
                    </div>

                    {/* Contract Details */}
                    <div>
                      <p className="font-medium text-gray-900">{contract.contractNumber}</p>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(contract.createdAt), { addSuffix: true })}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{contract.description}</p>
                    </div>
                  </div>

                  {/* Right Side - Amount, Status, Actions */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {formatIDRX(contract.amount)}
                      </div>
                      <p className="text-sm text-gray-600">{contract.currency}</p>
                    </div>

                    <div className="text-center">
                      <Badge className={`${getStatusColor(contract.status)} border font-medium mb-2`}>
                        {getStatusIcon(contract.status)}
                        <span className="ml-1 capitalize">{contract.status.replace('_', ' ')}</span>
                      </Badge>
                      <p className="text-xs text-gray-600 font-medium">
                        Until {new Date(contract.deadline).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link href={`/contracts/${contract.id}`}>
                        <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-700">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}