"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBalances } from "@/hooks/useBalances";
import { Wallet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BalanceDisplayProps {
  address: string | undefined;
}

export function BalanceDisplay({ address }: BalanceDisplayProps) {
  const { balances, loading, refetch } = useBalances(address);

  if (!address) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Balances</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              disabled={loading}
              className="h-6 w-6 p-0 hover:bg-blue-100"
            >
              <RefreshCw className={`h-3 w-3 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">ETH</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                {balances.eth}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">IDRX</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                {balances.idrx}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}