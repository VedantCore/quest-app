'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import {
  createCompanyAction,
  getCompaniesAction,
  updateCompanyAction,
  deleteCompanyAction,
  getCompanyUsersAction,
  assignUserToCompanyAction,
  removeUserFromCompanyAction,
  bulkAssignUsersToCompanyAction,
} from '@/app/company-actions';

export default function CompanyManagement({ allUsers }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Form state
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyDescription, setNewCompanyDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUnassignedModal, setShowUnassignedModal] = useState(false);
  const [unassignedUsers, setUnassignedUsers] = useState([]);

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, [user]);

  // Fetch unassigned users when companies or allUsers change
  useEffect(() => {
    if (companies.length > 0 && allUsers.length > 0) {
      fetchUnassignedUsers();
    }
  }, [companies.length, allUsers.length]);

  // Get users without any company assignments
  const fetchUnassignedUsers = async () => {
    if (!user || !allUsers.length) return;

    try {
      const token = await user.getIdToken();
      // Get all user-company relationships
      const assignedUserIds = new Set();

      for (const company of companies) {
        const result = await getCompanyUsersAction(token, company.company_id);
        if (result.success) {
          result.data.forEach((cu) => assignedUserIds.add(cu.user_id));
        }
      }

      // Filter users who don't have any company
      const usersWithoutCompanies = allUsers.filter(
        (u) => !assignedUserIds.has(u.user_id)
      );

      setUnassignedUsers(usersWithoutCompanies);
    } catch (error) {
      console.error('Error fetching unassigned users:', error);
    }
  };

  const fetchCompanies = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const result = await getCompaniesAction(token);
      if (result.success) {
        setCompanies(result.data);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    try {
      const token = await user.getIdToken();
      const result = await createCompanyAction(token, {
        name: newCompanyName,
        description: newCompanyDescription,
      });

      if (result.success) {
        toast.success('Company created successfully');
        setCompanies([...companies, result.data]);
        setShowCreateModal(false);
        setNewCompanyName('');
        setNewCompanyDescription('');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to create company');
    }
  };

  const handleDeleteCompany = async (companyId) => {
    if (!confirm('Are you sure you want to delete this company?')) return;

    try {
      const token = await user.getIdToken();
      const result = await deleteCompanyAction(token, companyId);

      if (result.success) {
        toast.success('Company deleted successfully');
        setCompanies(companies.filter((c) => c.company_id !== companyId));
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete company');
    }
  };

  const handleViewCompanyUsers = async (company) => {
    setSelectedCompany(company);
    try {
      const token = await user.getIdToken();
      const result = await getCompanyUsersAction(token, company.company_id);

      if (result.success) {
        setCompanyUsers(result.data);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch company users');
    }
  };

  const handleRemoveUserFromCompany = async (userId) => {
    if (!selectedCompany) return;

    try {
      const token = await user.getIdToken();
      const result = await removeUserFromCompanyAction(
        token,
        userId,
        selectedCompany.company_id
      );

      if (result.success) {
        toast.success('User removed from company');
        setCompanyUsers(companyUsers.filter((cu) => cu.user_id !== userId));
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove user');
    }
  };

  const handleBulkAssign = async (e) => {
    e.preventDefault();
    if (!selectedCompany || selectedUsers.length === 0) {
      toast.error('Please select users');
      return;
    }

    try {
      const token = await user.getIdToken();
      const result = await bulkAssignUsersToCompanyAction(
        token,
        selectedUsers,
        selectedCompany.company_id
      );

      if (result.success) {
        toast.success(`Assigned ${selectedUsers.length} users to company`);
        setShowAssignModal(false);
        setSelectedUsers([]);
        // Refresh company users
        handleViewCompanyUsers(selectedCompany);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to assign users');
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Company Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm hover:shadow-md"
        >
          Create Company
        </button>
      </div>

      {companies.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            No companies yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <div
              key={company.company_id}
              className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all duration-200"
            >
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                {company.name}
              </h3>
              <p className="text-sm text-gray-600 min-h-[40px]">
                {company.description || 'No description provided'}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleViewCompanyUsers(company)}
                  className="flex-1 text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  View Users
                </button>
                <button
                  onClick={() => handleDeleteCompany(company.company_id)}
                  className="text-sm font-medium bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Create New Company</h3>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newCompanyDescription}
                  onChange={(e) => setNewCompanyDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  rows="3"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Users Modal */}
      {selectedCompany && !showAssignModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {selectedCompany.name} - Users
              </h3>
              <button
                onClick={() => {
                  setSelectedCompany(null);
                  setCompanyUsers([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <button
              onClick={() => setShowAssignModal(true)}
              className="mb-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Assign Users
            </button>

            {companyUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No users assigned yet
              </p>
            ) : (
              <div className="space-y-2">
                {companyUsers.map((cu) => (
                  <div
                    key={cu.user_id}
                    className="flex justify-between items-center p-3 border rounded-md"
                  >
                    <div>
                      <p className="font-medium">{cu.users.name}</p>
                      <p className="text-sm text-gray-600">{cu.users.email}</p>
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                        {cu.users.role}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveUserFromCompany(cu.user_id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unassigned Users Modal */}
      {showUnassignedModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                Users Without Company Assignment ({unassignedUsers.length})
              </h3>
              <button
                onClick={() => setShowUnassignedModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {unassignedUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 border border-yellow-200 bg-yellow-50 rounded-md"
                >
                  <div className="flex-1">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {user.role}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {companies.map((company) => (
                      <button
                        key={company.company_id}
                        onClick={async () => {
                          const token = await user.getIdToken();
                          const result = await assignUserToCompanyAction(
                            token,
                            user.user_id,
                            company.company_id
                          );
                          if (result.success) {
                            toast.success(
                              `Assigned ${user.name} to ${company.name}`
                            );
                            fetchUnassignedUsers();
                          } else {
                            toast.error(result.error);
                          }
                        }}
                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        {company.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {companies.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                Create a company first before assigning users.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Assign Users Modal */}
      {showAssignModal && selectedCompany && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                Assign Users to {selectedCompany.name}
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedUsers([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkAssign}>
              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {allUsers.map((user) => {
                  const alreadyAssigned = companyUsers.some(
                    (cu) => cu.user_id === user.user_id
                  );
                  return (
                    <label
                      key={user.user_id}
                      className={`flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${
                        alreadyAssigned ? 'opacity-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.user_id)}
                        onChange={() => toggleUserSelection(user.user_id)}
                        disabled={alreadyAssigned}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                          {user.role}
                        </span>
                        {alreadyAssigned && (
                          <span className="ml-2 text-xs text-green-600">
                            Already assigned
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedUsers([]);
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  disabled={selectedUsers.length === 0}
                >
                  Assign {selectedUsers.length} User(s)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
