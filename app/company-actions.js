'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { adminAuth } from '@/lib/firebase-admin';

// ==========================================
// COMPANY CRUD OPERATIONS
// ==========================================

export async function createCompanyAction(token, companyData) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user is admin
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('user_id', uid)
      .single();

    if (userError || !user || user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Create company
    const { data, error } = await supabaseAdmin
      .from('companies')
      .insert([
        {
          name: companyData.name,
          description: companyData.description,
          created_by: uid,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating company:', error);
    return { success: false, error: error.message };
  }
}

export async function getCompaniesAction(token) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check user role
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('user_id', uid)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    let query = supabaseAdmin.from('companies').select('*').order('name');

    // If not admin, only show companies user is assigned to
    if (user.role !== 'admin') {
      const { data: userCompanies } = await supabaseAdmin
        .from('user_companies')
        .select('company_id')
        .eq('user_id', uid);

      const companyIds = userCompanies?.map((uc) => uc.company_id) || [];
      query = query.in('company_id', companyIds);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching companies:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCompanyAction(token, companyId, updates) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user is admin
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('user_id', uid)
      .single();

    if (userError || !user || user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const { data, error } = await supabaseAdmin
      .from('companies')
      .update(updates)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating company:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteCompanyAction(token, companyId) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user is admin
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('user_id', uid)
      .single();

    if (userError || !user || user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const { error } = await supabaseAdmin
      .from('companies')
      .delete()
      .eq('company_id', companyId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting company:', error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// USER-COMPANY ASSIGNMENT OPERATIONS
// ==========================================

export async function assignUserToCompanyAction(token, userId, companyId) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user is admin
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('user_id', uid)
      .single();

    if (userError || !user || user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const { data, error } = await supabaseAdmin
      .from('user_companies')
      .insert([
        {
          user_id: userId,
          company_id: companyId,
          assigned_by: uid,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error assigning user to company:', error);
    return { success: false, error: error.message };
  }
}

export async function removeUserFromCompanyAction(token, userId, companyId) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user is admin
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('user_id', uid)
      .single();

    if (userError || !user || user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const { error } = await supabaseAdmin
      .from('user_companies')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error removing user from company:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserCompaniesAction(token, userId) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user is admin or requesting own companies
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('user_id', uid)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    if (user.role !== 'admin' && uid !== userId) {
      throw new Error('Unauthorized');
    }

    const { data, error } = await supabaseAdmin
      .from('user_companies')
      .select(
        `
        company_id,
        assigned_at,
        companies (
          company_id,
          name,
          description
        )
      `
      )
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching user companies:', error);
    return { success: false, error: error.message };
  }
}

export async function getCompanyUsersAction(token, companyId) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user has access (admin or assigned to company)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('user_id', uid)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    if (user.role !== 'admin') {
      // Check if user is assigned to this company
      const { data: assignment } = await supabaseAdmin
        .from('user_companies')
        .select('id')
        .eq('user_id', uid)
        .eq('company_id', companyId)
        .single();

      if (!assignment) {
        throw new Error('Unauthorized');
      }
    }

    const { data, error } = await supabaseAdmin
      .from('user_companies')
      .select(
        `
        user_id,
        assigned_at,
        users!user_companies_user_id_fkey (
          user_id,
          name,
          email,
          role,
          avatar_url
        )
      `
      )
      .eq('company_id', companyId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching company users:', error);
    return { success: false, error: error.message };
  }
}

export async function bulkAssignUsersToCompanyAction(
  token,
  userIds,
  companyId
) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user is admin
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('user_id', uid)
      .single();

    if (userError || !user || user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const assignments = userIds.map((userId) => ({
      user_id: userId,
      company_id: companyId,
      assigned_by: uid,
    }));

    const { data, error } = await supabaseAdmin
      .from('user_companies')
      .upsert(assignments, { onConflict: 'user_id,company_id' })
      .select();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error bulk assigning users:', error);
    return { success: false, error: error.message };
  }
}
