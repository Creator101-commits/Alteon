/**
 * Assignments Page — slim orchestrator.
 *
 * Logic lives in useAssignments(); UI in sub-components under ./assignments/.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Search } from 'lucide-react';
import { AssignmentSkeleton } from '@/components/LoadingSkeletons';
import { NoAssignments, EmptyState } from '@/components/EmptyStates';

import { useAssignments } from './assignments/useAssignments';
import { AssignmentFilters } from './assignments/AssignmentFilters';
import { AssignmentCard } from './assignments/AssignmentCard';
import { AddAssignmentDialog } from './assignments/AddAssignmentDialog';

export default function Assignments() {
  const a = useAssignments();

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Your Assignments
        </h1>
        <p className="text-sm text-muted-foreground">
          Keep track of what you need to complete
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={a.handleSync}
          disabled={a.isSyncing || a.isRestoring}
          className="text-sm"
        >
          <RefreshCw
            className={`h-3 w-3 mr-1 ${a.isSyncing || a.isRestoring ? 'animate-spin' : ''}`}
          />
          {a.isSyncing || a.isRestoring ? 'Refreshing...' : 'Refresh'}
        </Button>

        <AddAssignmentDialog
          open={a.showAddDialog}
          onOpenChange={a.setShowAddDialog}
          newAssignment={a.newAssignment}
          onFieldChange={a.setNewAssignment}
          courses={a.courses}
          isAddingAssignment={a.isAddingAssignment}
          onSubmit={a.handleCreateAssignment}
        />
      </div>

      {/* Error alert */}
      {a.error && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{a.error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <AssignmentFilters
        searchTerm={a.searchTerm}
        onSearchChange={a.setSearchTerm}
        statusFilter={a.statusFilter}
        onStatusChange={a.setStatusFilter}
        classFilter={a.classFilter}
        onClassChange={a.setClassFilter}
        courses={a.courses}
      />

      {/* Loading state */}
      {(a.isLoading || a.isRestoring) && !a.assignments.length ? (
        <AssignmentSkeleton />
      ) : null}

      {/* Empty states */}
      {!a.isLoading && !a.isRestoring && a.assignments.length === 0 ? (
        <NoAssignments onAdd={() => a.setShowAddDialog(true)} />
      ) : null}

      {!a.isLoading &&
      !a.isRestoring &&
      a.filteredAssignments.length === 0 &&
      a.assignments.length > 0 ? (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="No matching assignments"
          description="No assignments match your current filters. Try adjusting your search or filter criteria."
          action={{
            label: 'Clear Filters',
            onClick: () => {
              a.setSearchTerm('');
              a.setStatusFilter('all');
              a.setClassFilter('all');
            },
          }}
        />
      ) : null}

      {/* Assignment list */}
      <div className="space-y-4">
        {a.filteredAssignments.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            courses={a.courses}
            onComplete={a.markAssignmentComplete}
            onDelete={a.deleteCustomAssignment}
          />
        ))}
      </div>

      {/* Footer count */}
      {a.filteredAssignments.length > 0 && (
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            Showing {a.filteredAssignments.length} of {a.assignments.length}{' '}
            assignment{a.assignments.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
